import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DelegationCreate,
  DelegationListFilter,
  DelegationRow,
  DelegationUpdate,
  HostAssignmentInput,
} from './ride.types';

const CLUB_REF_SELECT = { id: true, name: true, shortName: true } satisfies Prisma.ClubSelect;

const HOST_SELECT = {
  id: true,
  clubId: true,
  club: { select: CLUB_REF_SELECT },
  daysHosted: true,
  membersSent: true,
  assignedById: true,
} satisfies Prisma.RideDelegationHostSelect;

const DELEGATION_SELECT = {
  id: true,
  ryYear: true,
  visitingDistrict: true,
  country: true,
  startsAt: true,
  endsAt: true,
  headcount: true,
  contactName: true,
  contactEmail: true,
  status: true,
  hosts: { select: HOST_SELECT, orderBy: { createdAt: 'asc' } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RideDelegationSelect;

function whereFor(filter: DelegationListFilter): Prisma.RideDelegationWhereInput {
  const clauses: Prisma.RideDelegationWhereInput[] = [];
  if (filter.status) {
    clauses.push({ status: filter.status });
  } else {
    // Exclude cancelled delegations by default so they do not ghost in the admin view
    clauses.push({ status: { notIn: ['cancelled'] } });
  }
  if (filter.ryYear !== undefined) clauses.push({ ryYear: filter.ryYear });
  return clauses.length > 0 ? { AND: clauses } : {};
}

@Injectable()
export class RideDelegationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: DelegationListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: DelegationRow[]; total: number }> {
    const where = whereFor(filter);

    if (filter.approvedOnly) {
      const allCandidates = await this.prisma.rideDelegation.findMany({
        where,
        select: DELEGATION_SELECT,
        orderBy: { startsAt: 'asc' },
      });
      const enriched = await this.attachParticipants(allCandidates);
      const filtered = enriched.filter(
        (d) => d.status === 'confirmed' || (d.approvedParticipantsCount ?? 0) > 0,
      );
      const total = filtered.length;
      const items = filtered.slice((page - 1) * pageSize, page * pageSize);
      return { items, total };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rideDelegation.findMany({
        where,
        select: DELEGATION_SELECT,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rideDelegation.count({ where }),
    ]);
    const enriched = await this.attachParticipants(items);
    return { items: enriched, total };
  }

  async findById(id: string): Promise<DelegationRow | null> {
    const row = await this.prisma.rideDelegation.findUnique({ where: { id }, select: DELEGATION_SELECT });
    if (!row) return null;
    const [enriched] = await this.attachParticipants([row]);
    return enriched ?? null;
  }

  // Public "incoming" list: everything not cancelled, soonest first.
  async findIncoming(): Promise<DelegationRow[]> {
    const rows = await this.prisma.rideDelegation.findMany({
      where: { status: { not: 'cancelled' } },
      select: DELEGATION_SELECT,
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
    return this.attachParticipants(rows);
  }

  private async attachParticipants(delegations: any[]): Promise<DelegationRow[]> {
    if (delegations.length === 0) return [];
    const districts = [...new Set(delegations.map((d) => d.visitingDistrict))];
    const districtDigits = [
      ...new Set(districts.map((d) => d.replace(/\D/g, '')).filter((digits) => digits.length > 0)),
    ];

    const orClauses: Prisma.RideParticipantWhereInput[] = [
      { homeDistrict: { in: districts } },
    ];
    for (const d of districts) {
      orClauses.push({ homeDistrict: { contains: d, mode: 'insensitive' as const } });
    }
    for (const digit of districtDigits) {
      orClauses.push({ homeDistrict: { contains: digit, mode: 'insensitive' as const } });
    }

    const participants = await this.prisma.rideParticipant.findMany({
      where: { OR: orClauses },
      select: {
        id: true,
        fullName: true,
        email: true,
        rotaryId: true,
        homeDistrict: true,
        status: true,
        approvalStatus: true,
        hostClubId: true,
        hostFamilyName: true,
        hostFamilyPhone: true,
        hostAddress: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return delegations.map((d) => {
      const dDigits = d.visitingDistrict.replace(/\D/g, '');
      const matched = participants.filter((p) => {
        if (!p.homeDistrict) return false;
        const hd = p.homeDistrict.trim().toLowerCase();
        const vd = d.visitingDistrict.trim().toLowerCase();
        if (hd === vd || hd.includes(vd) || vd.includes(hd)) return true;
        if (dDigits.length > 0 && hd.includes(dDigits)) return true;
        return false;
      });
      const approvedCount = matched.filter((p) => p.approvalStatus === 'approved').length;
      return {
        ...d,
        participants: matched,
        approvedParticipantsCount: approvedCount,
      };
    });
  }

  async create(data: DelegationCreate): Promise<DelegationRow> {
    const created = await this.prisma.rideDelegation.create({
      data: {
        ryYear: data.ryYear,
        visitingDistrict: data.visitingDistrict,
        country: data.country,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        headcount: data.headcount,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        status: data.status,
      },
      select: { id: true },
    });
    return this.mustFind(created.id);
  }

  async update(id: string, data: DelegationUpdate): Promise<DelegationRow> {
    await this.prisma.rideDelegation.update({ where: { id }, data });
    return this.mustFind(id);
  }

  /** Replaces the full host set for a delegation; returns the union of previously- and
   * newly-assigned club ids so the caller can recompute points for everyone affected. */
  async replaceHosts(
    delegationId: string,
    hosts: HostAssignmentInput[],
    assignedById: string,
  ): Promise<{ affectedClubIds: string[] }> {
    const previous = await this.prisma.rideDelegationHost.findMany({
      where: { delegationId },
      select: { clubId: true },
    });
    await this.prisma.$transaction([
      this.prisma.rideDelegationHost.deleteMany({ where: { delegationId } }),
      this.prisma.rideDelegationHost.createMany({
        data: hosts.map((h) => ({
          delegationId,
          clubId: h.clubId,
          daysHosted: h.daysHosted,
          membersSent: h.membersSent,
          assignedById,
        })),
      }),
    ]);
    const affectedClubIds = new Set<string>();
    for (const p of previous) affectedClubIds.add(p.clubId);
    for (const h of hosts) affectedClubIds.add(h.clubId);
    return { affectedClubIds: [...affectedClubIds] };
  }

  async findExistingClubIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.club.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async findClubOfficerUserIds(clubId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: {
        scopeType: 'club',
        scopeId: clubId,
        role: { key: { in: ['president', 'secretary'] } },
      },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  countThisRy(ryYear: number): Promise<number> {
    return this.prisma.rideDelegation.count({ where: { ryYear } });
  }

  async countDistinctHostClubsThisRy(ryYear: number): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(DISTINCT h.club_id) as count
      FROM ride_delegation_hosts h
      JOIN ride_delegations d ON d.id = h.delegation_id
      WHERE d.ry_year = ${ryYear}
    `;
    return Number(result[0]?.count ?? 0);
  }

  async updateParticipantsHost(
    participantIds: string[],
    data: {
      hostClubId?: string;
      hostFamilyName?: string;
      hostFamilyPhone?: string;
      hostAddress?: string;
      status?: string;
      approvalStatus?: string;
    },
  ): Promise<void> {
    if (participantIds.length === 0) return;
    await this.prisma.rideParticipant.updateMany({
      where: { id: { in: participantIds } },
      data,
    });
  }

  async findParticipantIdsByDistrict(visitingDistrict: string): Promise<string[]> {
    const digits = visitingDistrict.replace(/\D/g, '');
    const participants = await this.prisma.rideParticipant.findMany({
      where: {
        OR: [
          { homeDistrict: { equals: visitingDistrict, mode: 'insensitive' as const } },
          { homeDistrict: { contains: visitingDistrict, mode: 'insensitive' as const } },
          ...(digits ? [{ homeDistrict: { contains: digits, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: { id: true },
    });
    return participants.map((p) => p.id);
  }

  async findApprovedHostClubs(): Promise<any[]> {
    const canonicalForm = await (this.prisma as any).customForm.findFirst({
      where: {
        OR: [
          { slug: 'delhi-meri-jaan-host-club-application-2026' },
          { title: { contains: 'Host Club Application', mode: 'insensitive' } },
        ],
      },
    });

    const formSubmissions = canonicalForm
      ? await (this.prisma as any).customFormSubmission.findMany({
          where: {
            formId: canonicalForm.id,
            status: 'approved',
          },
          orderBy: { submittedAt: 'desc' },
        })
      : [];

    const clubs = await this.prisma.club.findMany({
      select: { id: true, name: true, shortName: true },
    });
    const clubById = new Map(clubs.map((c) => [c.id, c]));
    const clubByName = new Map(clubs.map((c) => [c.name.toLowerCase().trim(), c]));

    const supportClubs = await (this.prisma as any).rideSupportClub.findMany({
      include: { club: { select: { id: true, name: true, shortName: true } } },
    });

    const results: any[] = [];
    const seenClubIds = new Set<string>();

    for (const sub of formSubmissions) {
      const vals = (sub.values as any) || {};
      let matchedClub = sub.clubId ? clubById.get(sub.clubId) : undefined;
      if (!matchedClub && (sub.clubName || vals.clubName)) {
        const nameToMatch = (sub.clubName || vals.clubName || '').toLowerCase().trim();
        matchedClub = clubByName.get(nameToMatch);
        if (!matchedClub) {
          for (const c of clubs) {
            if (c.name.toLowerCase().includes(nameToMatch) || nameToMatch.includes(c.name.toLowerCase())) {
              matchedClub = c;
              break;
            }
          }
        }
      }

      if (!matchedClub) continue;
      if (seenClubIds.has(matchedClub.id)) continue;
      seenClubIds.add(matchedClub.id);

      results.push({
        id: sub.id,
        clubId: matchedClub.id,
        club: matchedClub,
        applicantName: sub.applicantName || vals.name || vals.applicantName || matchedClub.name,
        applicantEmail: sub.applicantEmail || vals.email || '',
        applicantPhone: sub.applicantPhone || vals.phone || vals.contactPhone || '',
        zone: vals.zone || '',
        capacityDelegates: Number(vals.capacityDelegates || vals.expectedDelegatesCount || 10),
        homestayAvailable: vals.homestayAvailable !== false,
        proposalDriveUrl: vals.proposalDriveUrl || vals.driveUrl || null,
        notes: sub.notes || vals.motivation || null,
        status: 'approved',
        submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : new Date().toISOString(),
      });
    }

    for (const sc of supportClubs) {
      if (!sc.club || seenClubIds.has(sc.club.id)) continue;
      seenClubIds.add(sc.club.id);

      const notesText = sc.notes || '';
      const driveMatch = notesText.match(/Google Drive Proposal:\s*([^\s|]+)/i);
      const proposalUrl = driveMatch ? driveMatch[1].trim() : null;
      const zoneMatch = notesText.match(/Zone:\s*([^|]+)/i);
      const zone = zoneMatch ? zoneMatch[1].trim() : '';

      results.push({
        id: sc.id,
        clubId: sc.club.id,
        club: sc.club,
        applicantName: sc.club.name,
        applicantEmail: '',
        applicantPhone: sc.contactPhone || '',
        zone,
        capacityDelegates: sc.capacityDelegates || 10,
        homestayAvailable: sc.homestayAvailable ?? true,
        proposalDriveUrl: proposalUrl,
        notes: sc.notes,
        status: 'approved',
        submittedAt: sc.createdAt ? sc.createdAt.toISOString() : new Date().toISOString(),
      });
    }

    return results;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.rideDelegationHost.deleteMany({ where: { delegationId: id } });
    await this.prisma.rideDelegation.delete({ where: { id } });
  }

  private async mustFind(id: string): Promise<DelegationRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`RideDelegation ${id} vanished after write`);
    return row;
  }
}
