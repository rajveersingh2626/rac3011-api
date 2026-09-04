import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ContentBlockRow = { sectionKey: string; type: string; publishedValue: unknown };
export type SettingValue = unknown;

@Injectable()
export class ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedBlocks(pageKey: string): Promise<ContentBlockRow[]> {
    const rows = await this.prisma.contentBlock.findMany({
      where: { pageKey, publishedAt: { not: null } },
      select: { sectionKey: true, type: true, publishedValue: true },
    });
    return rows;
  }

  async getSetting(key: string): Promise<SettingValue> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value;
  }
}
