import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async incrementVisits(year: number): Promise<bigint> {
    const row = await this.prisma.pageView.upsert({
      where: { year },
      create: { year, count: 1n },
      update: { count: { increment: 1n } },
    });
    return row.count;
  }

  async visitsForYear(year: number): Promise<bigint> {
    const row = await this.prisma.pageView.findUnique({ where: { year } });
    return row?.count ?? 0n;
  }
}
