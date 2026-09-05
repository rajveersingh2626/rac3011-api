import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AnnouncementChannel,
  AnnouncementCreateInput,
  AnnouncementRow,
  RoleHolderCandidate,
} from './announcements.types';

@Injectable()
export class AnnouncementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: AnnouncementCreateInput): Promise<AnnouncementRow> {
    const row = await this.prisma.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        audience: input.audience,
        channels: input.channels,
        createdById: input.createdById,
      },
    });
    return toRow(row);
  }

  async markSent(id: string, recipientCount: number): Promise<void> {
    await this.prisma.announcement.update({
      where: { id },
      data: { sentAt: new Date(), recipientCount },
    });
  }

  async findFeed(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: AnnouncementRow[]; total: number }> {
    const where = { sentAt: { not: null } };
    const [rows, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.announcement.count({ where }),
    ]);
    if (rows.length > 0) {
      await this.prisma.announcementRead.createMany({
        data: rows.map((row) => ({ announcementId: row.id, userId })),
        skipDuplicates: true,
      });
    }
    return { items: rows.map(toRow), total };
  }

  // A club-scoped grant also counts as scoped to that club's zone and vice versa, so a
  // zoneIds query matches a club-scoped grant (spec §6.6 isn't same-dimension only).
  async findRoleHolderCandidates(roleKeys: string[]): Promise<RoleHolderCandidate[]> {
    if (roleKeys.length === 0) return [];
    const grants = await this.prisma.userRole.findMany({
      where: { role: { key: { in: roleKeys } } },
      select: { userId: true, scopeType: true, scopeId: true },
    });
    if (grants.length === 0) return [];

    const userIds = [...new Set(grants.map((g) => g.userId))];
    const profiles = await this.prisma.memberProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, clubId: true, club: { select: { zoneId: true } } },
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    const grantedClubIds = [
      ...new Set(
        grants.filter((g) => g.scopeType === 'club' && g.scopeId).map((g) => g.scopeId as string),
      ),
    ];
    const grantedZoneIds = [
      ...new Set(
        grants.filter((g) => g.scopeType === 'zone' && g.scopeId).map((g) => g.scopeId as string),
      ),
    ];
    const [clubsWithZone, clubsInGrantedZones] = await Promise.all([
      grantedClubIds.length
        ? this.prisma.club.findMany({
            where: { id: { in: grantedClubIds } },
            select: { id: true, zoneId: true },
          })
        : Promise.resolve([]),
      grantedZoneIds.length
        ? this.prisma.club.findMany({
            where: { zoneId: { in: grantedZoneIds } },
            select: { id: true, zoneId: true },
          })
        : Promise.resolve([]),
    ]);
    const zoneIdOfClub = new Map(clubsWithZone.map((c) => [c.id, c.zoneId]));
    const clubIdsOfZone = new Map<string, string[]>();
    for (const club of clubsInGrantedZones) {
      if (!club.zoneId) continue;
      const list = clubIdsOfZone.get(club.zoneId) ?? [];
      list.push(club.id);
      clubIdsOfZone.set(club.zoneId, list);
    }

    const grantsByUserId = new Map<string, typeof grants>();
    for (const grant of grants) {
      const list = grantsByUserId.get(grant.userId) ?? [];
      list.push(grant);
      grantsByUserId.set(grant.userId, list);
    }

    return userIds.map((userId) => {
      const profile = profileByUserId.get(userId);
      const userGrants = grantsByUserId.get(userId) ?? [];

      const scopedClubIds = new Set<string>();
      const scopedZoneIds = new Set<string>();
      for (const grant of userGrants) {
        if (grant.scopeType === 'club' && grant.scopeId) {
          scopedClubIds.add(grant.scopeId);
          const zoneId = zoneIdOfClub.get(grant.scopeId);
          if (zoneId) scopedZoneIds.add(zoneId);
        } else if (grant.scopeType === 'zone' && grant.scopeId) {
          scopedZoneIds.add(grant.scopeId);
          for (const clubId of clubIdsOfZone.get(grant.scopeId) ?? []) scopedClubIds.add(clubId);
        }
      }

      return {
        userId,
        clubId: profile?.clubId ?? null,
        zoneId: profile?.club.zoneId ?? null,
        scopedClubIds: [...scopedClubIds],
        scopedZoneIds: [...scopedZoneIds],
      };
    });
  }

  async findUserIdsForMemberIds(memberIds: string[]): Promise<string[]> {
    if (memberIds.length === 0) return [];
    const profiles = await this.prisma.memberProfile.findMany({
      where: { id: { in: memberIds } },
      select: { userId: true },
    });
    return profiles.map((p) => p.userId);
  }

  // clubId each memberId belongs to, for validating a club-scoped sender's explicit
  // memberIds audience against their allowed club set.
  async findClubIdsForMemberIds(memberIds: string[]): Promise<Map<string, string>> {
    if (memberIds.length === 0) return new Map();
    const profiles = await this.prisma.memberProfile.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, clubId: true },
    });
    return new Map(profiles.map((p) => [p.id, p.clubId]));
  }
}

function toRow(row: {
  id: string;
  title: string;
  body: string;
  audience: unknown;
  channels: string[];
  sendAt: Date | null;
  sentAt: Date | null;
  recipientCount: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): AnnouncementRow {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience ?? {},
    channels: row.channels as AnnouncementChannel[],
    sendAt: row.sendAt,
    sentAt: row.sentAt,
    recipientCount: row.recipientCount,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
