import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RclSettings } from './rcl.types';

const DEFAULTS: RclSettings = { pointsWin: 2, pointsTie: 1, season: 2026 };
const KEYS = ['rcl.pointsWin', 'rcl.pointsTie', 'rcl.season'] as const;

@Injectable()
export class RclSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<RclSettings> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: [...KEYS] } } });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return {
      pointsWin: (byKey.get('rcl.pointsWin') as number | undefined) ?? DEFAULTS.pointsWin,
      pointsTie: (byKey.get('rcl.pointsTie') as number | undefined) ?? DEFAULTS.pointsTie,
      season: (byKey.get('rcl.season') as number | undefined) ?? DEFAULTS.season,
    };
  }
}
