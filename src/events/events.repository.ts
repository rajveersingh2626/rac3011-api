import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicEventRow } from './events.types';

const SELECT = {
  id: true,
  title: true,
  slug: true,
  startsAt: true,
  endsAt: true,
  location: true,
  description: true,
  coverUrl: true,
  rsvpOpen: true,
  capacity: true,
} satisfies Prisma.EventSelect;

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findInRange(from: Date | undefined, to: Date | undefined): Promise<PublicEventRow[]> {
    const where: Prisma.EventWhereInput = {
      isDistrictEvent: true,
      startsAt: { gte: from, lte: to },
    };
    return this.prisma.event.findMany({ where, select: SELECT, orderBy: { startsAt: 'asc' } });
  }

  findBySlug(slug: string): Promise<PublicEventRow | null> {
    return this.prisma.event.findFirst({ where: { slug, isDistrictEvent: true }, select: SELECT });
  }

  findAllUpcoming(): Promise<PublicEventRow[]> {
    return this.prisma.event.findMany({
      where: { isDistrictEvent: true, startsAt: { gte: new Date() } },
      select: SELECT,
      orderBy: { startsAt: 'asc' },
    });
  }
}
