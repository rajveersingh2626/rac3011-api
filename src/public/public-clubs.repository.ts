import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicBoardMemberRow, PublicClubRow } from './public-clubs.types';

const CLUB_SELECT = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  zoneId: true,
  lat: true,
  lng: true,
  president: true,
  phone: true,
  email: true,
  secretary: true,
  secretaryEmail: true,
  secretaryPhone: true,
  meetingInfo: true,
  socialLinks: true,
  logoUrl: true,
  memberCount: true,
  charterDate: true,
} satisfies Prisma.ClubSelect;

const BOARD_SELECT = {
  id: true,
  name: true,
  position: true,
  bloodGroup: true,
  phone: true,
  email: true,
  ryYear: true,
  order: true,
} satisfies Prisma.ClubBoardMemberSelect;

@Injectable()
export class PublicClubsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(zoneId?: string): Promise<PublicClubRow[]> {
    return this.prisma.club.findMany({
      where: { isActive: true, zoneId },
      select: CLUB_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  findBySlug(slug: string): Promise<PublicClubRow | null> {
    return this.prisma.club.findFirst({ where: { slug, isActive: true }, select: CLUB_SELECT });
  }

  async currentBoard(clubId: string): Promise<PublicBoardMemberRow[]> {
    const latest = await this.prisma.clubBoardMember.aggregate({
      where: { clubId },
      _max: { ryYear: true },
    });
    const ryYear = latest._max.ryYear;
    if (ryYear == null) return [];
    return this.prisma.clubBoardMember.findMany({
      where: { clubId, ryYear },
      select: BOARD_SELECT,
      orderBy: { order: 'asc' },
    });
  }
}
