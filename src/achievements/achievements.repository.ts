import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AchievementRow } from './achievements.types';

const SELECT = {
  id: true,
  type: true,
  title: true,
  clubId: true,
  date: true,
  certificateUrl: true,
  description: true,
  order: true,
} as const;

@Injectable()
export class AchievementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<AchievementRow[]> {
    return this.prisma.achievement.findMany({
      select: SELECT,
      orderBy: [{ order: 'asc' }, { date: 'desc' }],
    });
  }
}
