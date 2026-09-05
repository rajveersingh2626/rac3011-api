import { Injectable } from '@nestjs/common';
import { ProjectKey, type Prisma } from '@prisma/client';
import type { ClubScopeFilter } from '../common/scope/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CheckinMethod,
  CheckinRow,
  ClubAttendanceCount,
  EventCreateInput,
  EventListFilter,
  EventRow,
  EventUpdateInput,
  RsvpRow,
  RsvpStatus,
} from './events-admin.types';

const EVENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  startsAt: true,
  endsAt: true,
  location: true,
  description: true,
  coverUrl: true,
  isDistrictEvent: true,
  clubId: true,
  projectKey: true,
  rsvpOpen: true,
  capacity: true,
  photos: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EventSelect;

function clubWhere(scope: ClubScopeFilter): Prisma.EventWhereInput | undefined {
  if ('all' in scope) return undefined;
  return { OR: [{ clubId: { in: scope.clubIds } }, { isDistrictEvent: true }] };
}

@Injectable()
export class EventsAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: EventListFilter,
    scope: ClubScopeFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: EventRow[]; total: number }> {
    const where: Prisma.EventWhereInput = {
      ...clubWhere(scope),
      ...(filter.from || filter.to ? { startsAt: { gte: filter.from, lte: filter.to } } : {}),
      ...(filter.clubId ? { clubId: filter.clubId } : {}),
      ...(filter.isDistrictEvent !== undefined ? { isDistrictEvent: filter.isDistrictEvent } : {}),
      ...(filter.projectKey ? { projectKey: filter.projectKey as ProjectKey } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: EVENT_SELECT,
        orderBy: { startsAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { items: items, total };
  }

  async findById(id: string): Promise<EventRow | null> {
    return this.prisma.event.findUnique({
      where: { id },
      select: EVENT_SELECT,
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    const row = await this.prisma.event.findUnique({ where: { slug }, select: { id: true } });
    return !!row;
  }

  async create(input: EventCreateInput): Promise<EventRow> {
    return this.prisma.event.create({ data: input, select: EVENT_SELECT });
  }

  async update(id: string, input: EventUpdateInput): Promise<EventRow> {
    return this.prisma.event.update({
      where: { id },
      data: input,
      select: EVENT_SELECT,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.event.delete({ where: { id } });
  }

  async findClubIdById(clubId: string): Promise<string | null> {
    const row = await this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
    return row?.id ?? null;
  }

  async findRsvp(eventId: string, memberId: string): Promise<RsvpRow | null> {
    return this.prisma.eventRsvp.findUnique({ where: { eventId_memberId: { eventId, memberId } } });
  }

  async upsertRsvp(eventId: string, memberId: string, status: RsvpStatus): Promise<RsvpRow> {
    return this.prisma.eventRsvp.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      create: { eventId, memberId, status },
      update: { status },
    });
  }

  async countRsvpGoing(eventId: string): Promise<number> {
    return this.prisma.eventRsvp.count({ where: { eventId, status: 'going' } });
  }

  async findRsvpForMember(eventId: string, memberId: string): Promise<RsvpStatus | null> {
    const row = await this.prisma.eventRsvp.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
      select: { status: true },
    });
    return row?.status ?? null;
  }

  async findMemberIdByQrToken(qrToken: string): Promise<{ id: string; clubId: string } | null> {
    return this.prisma.memberProfile.findUnique({
      where: { qrToken },
      select: { id: true, clubId: true },
    });
  }

  async findMemberById(memberId: string): Promise<{ id: string; clubId: string } | null> {
    return this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      select: { id: true, clubId: true },
    });
  }

  async findCheckin(eventId: string, memberId: string): Promise<CheckinRow | null> {
    return this.prisma.eventCheckin.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
    });
  }

  async countCheckins(eventId: string): Promise<number> {
    return this.prisma.eventCheckin.count({ where: { eventId } });
  }

  async createCheckin(input: {
    eventId: string;
    memberId: string | null;
    walkInName: string | null;
    clubId: string;
    method: CheckinMethod;
    checkedInById: string;
  }): Promise<CheckinRow> {
    return this.prisma.eventCheckin.create({ data: input });
  }

  async findCheckins(eventId: string, scope: ClubScopeFilter): Promise<CheckinRow[]> {
    return this.prisma.eventCheckin.findMany({
      where: { eventId, ...('all' in scope ? {} : { clubId: { in: scope.clubIds } }) },
      orderBy: { checkedInAt: 'desc' },
    });
  }

  async findClubCounts(eventId: string, scope: ClubScopeFilter): Promise<ClubAttendanceCount[]> {
    const rows = await this.prisma.eventCheckin.groupBy({
      by: ['clubId'],
      where: { eventId, ...('all' in scope ? {} : { clubId: { in: scope.clubIds } }) },
      _count: { _all: true },
    });
    if (rows.length === 0) return [];
    const clubs = await this.prisma.club.findMany({
      where: { id: { in: rows.map((r) => r.clubId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(clubs.map((c) => [c.id, c.name]));
    return rows
      .map((r) => ({
        clubId: r.clubId,
        clubName: nameById.get(r.clubId) ?? r.clubId,
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
