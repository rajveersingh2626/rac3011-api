import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ApprovedHostClubRow,
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

const PARTICIPANT_SELECT = {
  id: true,
  fullName: true,
  email: true,
  rotaryId: true,
  delegationId: true,
  homeDistrict: true,
  status: true,
  approvalStatus: true,
  hostClubId: true,
  hostFamilyName: true,
  hostFamilyPhone: true,
  hostAddress: true,
} satisfies Prisma.RideParticipantSelect;

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
  if (filter.status) clauses.push({ status: filter.status });
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
    const [rawItems, total] = await this.prisma.$transaction([
      this.prisma.rideDelegation.findMany({
        where,
        select: DELEGATION_SELECT,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rideDelegation.count({ where }),
    ]);

    const delegationIds = rawItems.map((i) => i.id);
    const districts = rawItems.map((i) => i.visitingDistrict);

    const districtParticipants = await this.prisma.rideParticipant.findMany({
      where: {
        isActive: true,
        OR: [
          { delegationId: { in: delegationIds } },
          { homeDistrict: { in: districts } },
        ],
      },
      select: PARTICIPANT_SELECT,
      orderBy: { fullName: 'asc' },
    });

    const enrichedItems: DelegationRow[] = rawItems.map((item) => {
      const parts = districtParticipants.filter(
        (p) => p.delegationId === item.id || (!p.delegationId && p.homeDistrict === item.visitingDistrict),
      );
      const approvedParts = parts.filter(
        (p) => p.status === 'approved' || p.approvalStatus === 'approved' || p.approvalStatus === 'confirmed',
      );
      return {
        ...item,
        participants: parts,
        approvedParticipantsCount: approvedParts.length,
      };
    });

    if (filter.approvedOnly) {
      const filtered = enrichedItems.filter(
        (item) => item.status === 'confirmed' || (item.approvedParticipantsCount ?? 0) > 0,
      );
      return { items: filtered, total: filtered.length };
    }

    return { items: enrichedItems, total };
  }

  async findById(id: string): Promise<DelegationRow | null> {
    const row = await this.prisma.rideDelegation.findUnique({ where: { id }, select: DELEGATION_SELECT });
    if (!row) return null;
    const parts = await this.prisma.rideParticipant.findMany({
      where: {
        isActive: true,
        OR: [{ delegationId: row.id }, { homeDistrict: row.visitingDistrict }],
      },
      select: PARTICIPANT_SELECT,
      orderBy: { fullName: 'asc' },
    });
    const approvedParts = parts.filter(
      (p) => p.status === 'approved' || p.approvalStatus === 'approved' || p.approvalStatus === 'confirmed',
    );
    return {
      ...row,
      participants: parts,
      approvedParticipantsCount: approvedParts.length,
    };
  }

  // Public "incoming" list: everything not cancelled, soonest first.
  findIncoming(): Promise<DelegationRow[]> {
    return this.prisma.rideDelegation.findMany({
      where: { status: { not: 'cancelled' } },
      select: DELEGATION_SELECT,
      orderBy: { startsAt: 'asc' },
      take: 200,
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
   * newly-assigned club ids so the caller can recompute points for everyone affected.
   * Also propagates the host club assignment to participants belonging to this delegation. */
  async replaceHosts(
    delegationId: string,
    hosts: HostAssignmentInput[],
    assignedById: string,
    participantIds?: string[],
    visitingDistrict?: string,
  ): Promise<{ affectedClubIds: string[] }> {
    const previous = await this.prisma.rideDelegationHost.findMany({
      where: { delegationId },
      select: { clubId: true },
    });

    const primaryHost = hosts[0];

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete previous delegation hosts and insert new ones
      await tx.rideDelegationHost.deleteMany({ where: { delegationId } });
      if (hosts.length > 0) {
        await tx.rideDelegationHost.createMany({
          data: hosts.map((h) => ({
            delegationId,
            clubId: h.clubId,
            daysHosted: h.daysHosted,
            membersSent: h.membersSent ?? 0,
            assignedById,
          })),
        });
      }

      // 2. Propagate host assignment to participants
      if (hosts.length > 0 && primaryHost) {
        if (participantIds && participantIds.length > 0) {
          await tx.rideParticipant.updateMany({
            where: { id: { in: participantIds } },
            data: {
              hostClubId: primaryHost.clubId,
              delegationId,
              hostFamilyName: primaryHost.hostFamilyName || undefined,
              hostFamilyPhone: primaryHost.hostFamilyPhone || undefined,
              hostAddress: primaryHost.hostAddress || undefined,
            },
          });
        } else {
          // Entire delegation
          await tx.rideParticipant.updateMany({
            where: {
              OR: [
                { delegationId },
                ...(visitingDistrict ? [{ homeDistrict: visitingDistrict, isActive: true }] : []),
              ],
            },
            data: {
              hostClubId: primaryHost.clubId,
              delegationId,
              hostFamilyName: primaryHost.hostFamilyName || undefined,
              hostFamilyPhone: primaryHost.hostFamilyPhone || undefined,
              hostAddress: primaryHost.hostAddress || undefined,
            },
          });
        }
      } else {
        // Reset host allocation
        await tx.rideParticipant.updateMany({
          where: {
            OR: [
              { delegationId },
              ...(visitingDistrict ? [{ homeDistrict: visitingDistrict, isActive: true }] : []),
            ],
          },
          data: {
            hostClubId: null,
            hostFamilyName: null,
            hostFamilyPhone: null,
            hostAddress: null,
          },
        });
      }
    });

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

  /**
   * Retrieves verified Approved Host Clubs that submitted a Host Club Application
   * through Form Builder (`custom_form_submissions` marked as 'approved').
   */
  async findApprovedHostClubs(): Promise<ApprovedHostClubRow[]> {
    const submissions = await this.prisma.customFormSubmission.findMany({
      where: {
        status: 'approved',
        OR: [
          { form: { slug: 'delhi-meri-jaan-host-club-application-2026' } },
          { form: { title: { contains: 'Host Club Application', mode: 'insensitive' } } },
        ],
      },
      include: {
        form: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    const clubIds = new Set<string>();
    for (const s of submissions) {
      if (s.clubId) clubIds.add(s.clubId);
    }

    const supportClubs = await this.prisma.rideSupportClub.findMany({
      include: { club: { select: CLUB_REF_SELECT } },
    });
    const supportClubMap = new Map<string, (typeof supportClubs)[0]>();
    for (const sc of supportClubs) {
      supportClubMap.set(sc.clubId, sc);
      clubIds.add(sc.clubId);
    }

    const clubs = await this.prisma.club.findMany({
      where: { id: { in: Array.from(clubIds) } },
      select: CLUB_REF_SELECT,
    });
    const clubMap = new Map<string, (typeof clubs)[0]>();
    for (const c of clubs) clubMap.set(c.id, c);

    const approvedHosts: ApprovedHostClubRow[] = [];
    const seenClubIds = new Set<string>();

    for (const s of submissions) {
      if (!s.clubId || seenClubIds.has(s.clubId)) continue;
      seenClubIds.add(s.clubId);

      const club = clubMap.get(s.clubId) || { id: s.clubId, name: s.clubName || 'Unknown Club', shortName: null };
      const sc = supportClubMap.get(s.clubId);
      const vals = (s.values as Record<string, any>) || {};

      approvedHosts.push({
        id: s.id,
        clubId: s.clubId,
        club,
        applicantName: s.applicantName || String(vals.name || 'Applicant'),
        applicantEmail: s.applicantEmail || String(vals.email || ''),
        applicantPhone: s.applicantPhone || String(vals.phone || ''),
        zone: String(vals.zone || ''),
        capacityDelegates: sc?.capacityDelegates ?? (Number(vals.capacity) || 10),
        homestayAvailable: sc?.homestayAvailable ?? Boolean(vals.homestayAvailable ?? true),
        proposalDriveUrl: vals.proposalDriveUrl ? String(vals.proposalDriveUrl) : null,
        notes: s.notes || (vals.motivation ? String(vals.motivation) : null),
        status: 'approved',
        submittedAt: s.submittedAt,
      });
    }

    // Fallback support clubs if none in submissions
    for (const sc of supportClubs) {
      if (seenClubIds.has(sc.clubId)) continue;
      seenClubIds.add(sc.clubId);
      approvedHosts.push({
        id: sc.id,
        clubId: sc.clubId,
        club: sc.club,
        applicantName: 'Support Club Coordinator',
        applicantEmail: '',
        applicantPhone: sc.contactPhone,
        zone: '',
        capacityDelegates: sc.capacityDelegates,
        homestayAvailable: sc.homestayAvailable,
        proposalDriveUrl: null,
        notes: sc.notes,
        status: 'approved',
        submittedAt: sc.createdAt,
      });
    }

    return approvedHosts;
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

  private async mustFind(id: string): Promise<DelegationRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`RideDelegation ${id} vanished after write`);
    return row;
  }
}

