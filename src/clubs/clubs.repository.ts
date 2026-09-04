import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubScopeFilter } from '../common/scope/scope.service';
import type { BoardMemberInput, ClubUpdate, ClubWithRelations, ZoneRow } from './clubs.types';

const CLUB_SELECT = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  zone: true,
  zoneId: true,
  lat: true,
  lng: true,
  president: true,
  phone: true,
  email: true,
  rotaryId: true,
  secretary: true,
  secretaryEmail: true,
  secretaryPhone: true,
  charterDate: true,
  isActive: true,
  meetingInfo: true,
  socialLinks: true,
  logoUrl: true,
  memberCount: true,
} satisfies Prisma.ClubSelect;

export type ClubListFilter = { zoneId?: string; q?: string };
export type ClubIncludes = { board?: boolean; facts?: boolean };

@Injectable()
export class ClubsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private whereFor(filter: ClubListFilter, scope: ClubScopeFilter): Prisma.ClubWhereInput {
    const scopeWhere: Prisma.ClubWhereInput = 'all' in scope ? {} : { id: { in: scope.clubIds } };
    return {
      ...scopeWhere,
      zoneId: filter.zoneId,
      OR: filter.q
        ? [
            { name: { contains: filter.q, mode: 'insensitive' } },
            { shortName: { contains: filter.q, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }

  async findMany(
    filter: ClubListFilter,
    scope: ClubScopeFilter,
    include: ClubIncludes,
    page: number,
    pageSize: number,
  ): Promise<{ items: ClubWithRelations[]; total: number }> {
    const where = this.whereFor(filter, scope);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.club.findMany({
        where,
        select: {
          ...CLUB_SELECT,
          board: include.board ? true : undefined,
          facts: include.facts ? true : undefined,
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.club.count({ where }),
    ]);
    return { items: items, total };
  }

  async findById(id: string, include: ClubIncludes): Promise<ClubWithRelations | null> {
    const row = await this.prisma.club.findUnique({
      where: { id },
      select: {
        ...CLUB_SELECT,
        board: include.board ? true : undefined,
        facts: include.facts ? true : undefined,
      },
    });
    return row;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.club.count({ where: { id } })) > 0;
  }

  async update(id: string, data: ClubUpdate): Promise<ClubWithRelations> {
    const row = await this.prisma.club.update({
      where: { id },
      data: data as Prisma.ClubUpdateInput,
      select: CLUB_SELECT,
    });
    return row;
  }

  async replaceBoard(clubId: string, ryYear: number, members: BoardMemberInput[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.clubBoardMember.deleteMany({ where: { clubId, ryYear } }),
      this.prisma.clubBoardMember.createMany({
        data: members.map((m, i) => ({
          clubId,
          ryYear,
          memberId: m.memberId ?? null,
          name: m.name,
          position: m.position,
          bloodGroup: m.bloodGroup ?? null,
          phone: m.phone ?? null,
          email: m.email ?? null,
          order: m.order ?? i,
        })),
      }),
    ]);
  }

  async listZones(): Promise<ZoneRow[]> {
    const zones = await this.prisma.zone.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { clubs: true } } },
    });
    return zones.map((z) => ({
      id: z.id,
      name: z.name,
      order: z.order,
      clubCount: z._count.clubs,
    }));
  }
}
