import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DistrictTeamRow } from './leadership.types';

const SELECT = {
  id: true,
  name: true,
  designation: true,
  kind: true,
  order: true,
  photoUrl: true,
  phone: true,
  email: true,
  bio: true,
  clubId: true,
  ryYear: true,
} as const;

@Injectable()
export class LeadershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async currentTeam(): Promise<DistrictTeamRow[]> {
    const latest = await this.prisma.districtTeamMember.aggregate({ _max: { ryYear: true } });
    const ryYear = latest._max.ryYear;
    if (ryYear == null) return [];
    return this.prisma.districtTeamMember.findMany({
      where: { ryYear },
      select: SELECT,
      orderBy: { order: 'asc' },
    });
  }
}
