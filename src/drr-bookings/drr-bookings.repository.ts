import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DECIDABLE_FROM,
  DuplicateBookingReferenceError,
  type BookingDecision,
  type DrrBookingCreateInput,
  type DrrBookingListFilter,
  type DrrBookingRow,
  type DrrOfficer,
} from './drr-bookings.types';

const SELECT = {
  id: true,
  reference: true,
  purpose: true,
  clubId: true,
  requesterName: true,
  requesterEmail: true,
  requesterPhone: true,
  startsAt: true,
  endsAt: true,
  notes: true,
  status: true,
  decisionReason: true,
  decidedById: true,
  decidedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DrrBookingSelect;

@Injectable()
export class DrrBookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: DrrBookingCreateInput): Promise<DrrBookingRow> {
    try {
      return await this.prisma.drrBooking.create({ data: input, select: SELECT });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        (err.meta?.target as string[] | undefined)?.includes('reference')
      ) {
        throw new DuplicateBookingReferenceError(input.reference);
      }
      throw err;
    }
  }

  findById(id: string): Promise<DrrBookingRow | null> {
    return this.prisma.drrBooking.findUnique({ where: { id }, select: SELECT });
  }

  findByReference(reference: string): Promise<DrrBookingRow | null> {
    return this.prisma.drrBooking.findUnique({ where: { reference }, select: SELECT });
  }

  async findMany(
    filter: DrrBookingListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: DrrBookingRow[]; total: number }> {
    const where: Prisma.DrrBookingWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.clubId ? { clubId: filter.clubId } : {}),
      ...(filter.from || filter.to
        ? {
            startsAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.drrBooking.findMany({
        where,
        select: SELECT,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.drrBooking.count({ where }),
    ]);
    return { items, total };
  }

  // Conditional on the current status, so two concurrent decides cannot both win.
  // Null means the row was already decided (or gone) by the time we wrote.
  async decide(
    id: string,
    input: { status: BookingDecision; decisionReason: string | null; decidedById: string },
  ): Promise<DrrBookingRow | null> {
    const { count } = await this.prisma.drrBooking.updateMany({
      where: { id, status: { in: [...DECIDABLE_FROM] } },
      data: { ...input, decidedAt: new Date() },
    });
    if (count === 0) return null;
    return this.prisma.drrBooking.findUnique({ where: { id }, select: SELECT });
  }

  async clubExists(clubId: string): Promise<boolean> {
    const row = await this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
    return !!row;
  }

  // Only notify the designated District Rotaract Representative (DRR),
  // Super Admins, Tech RID, and designated DSC secretariats (Himanshu, Shefali, Sarthak).
  async findOfficers(permissionKey: string): Promise<DrrOfficer[]> {
    const TARGET_EMAILS = [
      'himanshugulati.rotary@gmail.com',
      'rtrshefali2004@gmail.com',
      'sarthakmanchanda2@gmail.com',
      'techrid3011@gmail.com',
    ];

    const [drrRows, adminRows, specificEmailUsers] = await Promise.all([
      this.prisma.userRole.findMany({
        where: {
          scopeType: 'none',
          role: { key: 'drr' },
        },
        select: { userId: true, user: { select: { email: true } } },
      }),
      this.prisma.userRole.findMany({
        where: {
          scopeType: 'none',
          role: { key: 'super_admin' },
        },
        select: { userId: true, user: { select: { email: true } } },
      }),
      this.prisma.user.findMany({
        where: {
          email: { in: TARGET_EMAILS, mode: 'insensitive' },
        },
        select: { id: true, email: true },
      }),
    ]);

    const byUser = new Map<string, DrrOfficer>();

    for (const row of drrRows) {
      if (row.user?.email) byUser.set(row.userId, { userId: row.userId, email: row.user.email });
    }
    for (const row of adminRows) {
      if (row.user?.email) byUser.set(row.userId, { userId: row.userId, email: row.user.email });
    }
    for (const u of specificEmailUsers) {
      if (u.email) byUser.set(u.id, { userId: u.id, email: u.email });
    }

    return [...byUser.values()];
  }

  async syncToCalendarEvent(row: DrrBookingRow, decidedById: string): Promise<void> {
    let clubName = '';
    if (row.clubId) {
      const club = await this.prisma.club.findUnique({ where: { id: row.clubId }, select: { name: true, shortName: true } });
      if (club) clubName = club.shortName || club.name;
    }

    const title = clubName
      ? `DRR Visit: ${clubName}`
      : `Official DRR Presence (${row.requesterName})`;

    const slug = `drr-${row.reference.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    await this.prisma.event.upsert({
      where: { slug },
      create: {
        title,
        slug,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        location: clubName ? `Rotaract Club of ${clubName}` : 'District 3011',
        description: `Official District Rotaract Representative visit (${row.purpose}). Reference: ${row.reference}. Notes: ${row.notes || 'None'}`,
        isDistrictEvent: true,
        clubId: row.clubId,
        rsvpOpen: false,
        createdById: decidedById,
      },
      update: {
        title,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        location: clubName ? `Rotaract Club of ${clubName}` : 'District 3011',
        description: `Official District Rotaract Representative visit (${row.purpose}). Reference: ${row.reference}. Notes: ${row.notes || 'None'}`,
      },
    });
  }

  async removeCalendarEvent(reference: string): Promise<void> {
    const slug = `drr-${reference.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    await this.prisma.event.deleteMany({ where: { slug } });
  }

  async listBlocks(from?: Date, to?: Date) {
    const where: Prisma.DrrBlockWhereInput = {};
    if (from || to) {
      where.startsAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }
    return this.prisma.drrBlock.findMany({
      where,
      orderBy: { startsAt: 'asc' },
    });
  }

  async createBlock(data: { startsAt: Date; endsAt: Date; reason?: string | null; createdById: string }) {
    return this.prisma.drrBlock.create({
      data: {
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        reason: data.reason ?? null,
        createdById: data.createdById,
      },
    });
  }

  async deleteBlock(id: string) {
    await this.prisma.drrBlock.delete({ where: { id } });
  }

  async findConfirmedBookings(from?: Date, to?: Date) {
    const where: Prisma.DrrBookingWhereInput = { status: 'confirmed' };
    if (from || to) {
      where.startsAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }
    return this.prisma.drrBooking.findMany({
      where,
      include: { club: { select: { id: true, name: true, shortName: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }
}
