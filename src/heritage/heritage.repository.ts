import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PastDrrRow } from './heritage.types';

const SELECT = {
  id: true,
  name: true,
  slug: true,
  terms: true,
  homeClubId: true,
  photoUrl: true,
  bio: true,
  order: true,
  isLowResPhoto: true,
} as const;

@Injectable()
export class HeritageRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PastDrrRow[]> {
    return this.prisma.pastDrr.findMany({ select: SELECT, orderBy: { order: 'asc' } });
  }

  findBySlug(slug: string): Promise<PastDrrRow | null> {
    return this.prisma.pastDrr.findUnique({ where: { slug }, select: SELECT });
  }
}
