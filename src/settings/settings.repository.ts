import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SettingRow = { key: string; value: unknown };

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<SettingRow[]> {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  findMany(keys: string[]): Promise<SettingRow[]> {
    return this.prisma.setting.findMany({ where: { key: { in: keys } } });
  }

  async upsertMany(entries: { key: string; value: unknown }[], updatedById: string): Promise<void> {
    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.setting.upsert({
          where: { key: entry.key },
          create: { key: entry.key, value: entry.value as Prisma.InputJsonValue, updatedById },
          update: { value: entry.value as Prisma.InputJsonValue, updatedById },
        }),
      ),
    );
  }

  async findClubPresidentUserIds(clubId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { scopeType: 'club', scopeId: clubId, role: { key: 'president' } },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }
}
