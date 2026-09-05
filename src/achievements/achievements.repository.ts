import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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
} satisfies Prisma.AchievementSelect;

export type AchievementWrite = {
  type?: 'chartered_club' | 'award' | 'milestone';
  title?: string;
  clubId?: string | null;
  date?: string;
  certificateUrl?: string | null;
  description?: string | null;
};

@Injectable()
export class AchievementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<AchievementRow[]> {
    return this.prisma.achievement.findMany({
      select: SELECT,
      orderBy: [{ order: 'asc' }, { date: 'desc' }],
    });
  }

  findById(id: string): Promise<AchievementRow | null> {
    return this.prisma.achievement.findUnique({ where: { id }, select: SELECT });
  }

  async nextOrder(): Promise<number> {
    const max = await this.prisma.achievement.aggregate({ _max: { order: true } });
    return (max._max.order ?? -1) + 1;
  }

  async create(
    input: Required<Pick<AchievementWrite, 'type' | 'title' | 'date'>> & AchievementWrite,
  ): Promise<AchievementRow> {
    const order = await this.nextOrder();
    return this.prisma.achievement.create({
      data: {
        type: input.type,
        title: input.title,
        clubId: input.clubId ?? null,
        date: new Date(`${input.date}T00:00:00.000Z`),
        certificateUrl: input.certificateUrl ?? null,
        description: input.description ?? null,
        order,
      },
      select: SELECT,
    });
  }

  update(id: string, input: AchievementWrite): Promise<AchievementRow> {
    return this.prisma.achievement.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.clubId !== undefined ? { clubId: input.clubId } : {}),
        ...(input.date !== undefined ? { date: new Date(`${input.date}T00:00:00.000Z`) } : {}),
        ...(input.certificateUrl !== undefined ? { certificateUrl: input.certificateUrl } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      select: SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.achievement.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, order) => this.prisma.achievement.update({ where: { id }, data: { order } })),
    );
  }
}
