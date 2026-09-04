import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScopeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findZoneIdOfClub(clubId: string): Promise<string | null | undefined> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { zoneId: true },
    });
    return club ? club.zoneId : undefined;
  }

  async findClubIdsInZones(zoneIds: string[]): Promise<string[]> {
    if (zoneIds.length === 0) return [];
    const clubs = await this.prisma.club.findMany({
      where: { zoneId: { in: zoneIds } },
      select: { id: true },
    });
    return clubs.map((c) => c.id);
  }
}
