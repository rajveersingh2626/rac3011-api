import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ContentBlockAdminRow, ContentBlockType } from './content.types';

export type ContentBlockRow = { sectionKey: string; type: string; publishedValue: unknown };
export type SettingValue = unknown;

const ADMIN_SELECT = {
  id: true,
  pageKey: true,
  sectionKey: true,
  type: true,
  draftValue: true,
  publishedValue: true,
  publishedAt: true,
  updatedById: true,
} satisfies Prisma.ContentBlockSelect;

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

  findMany(pageKey?: string): Promise<ContentBlockAdminRow[]> {
    return this.prisma.contentBlock.findMany({
      where: pageKey ? { pageKey } : {},
      select: ADMIN_SELECT,
      orderBy: [{ pageKey: 'asc' }, { sectionKey: 'asc' }],
    });
  }

  findOne(pageKey: string, sectionKey: string): Promise<ContentBlockAdminRow | null> {
    return this.prisma.contentBlock.findUnique({
      where: { pageKey_sectionKey: { pageKey, sectionKey } },
      select: ADMIN_SELECT,
    });
  }

  upsertDraft(
    pageKey: string,
    sectionKey: string,
    data: { type?: ContentBlockType; draftValue?: unknown },
    updatedById: string,
  ): Promise<ContentBlockAdminRow> {
    const draftValue = (data.draftValue ?? null) as Prisma.InputJsonValue;
    return this.prisma.contentBlock.upsert({
      where: { pageKey_sectionKey: { pageKey, sectionKey } },
      create: {
        pageKey,
        sectionKey,
        type: data.type ?? 'text',
        draftValue,
        updatedById,
      },
      update: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.draftValue !== undefined ? { draftValue } : {}),
        updatedById,
      },
      select: ADMIN_SELECT,
    });
  }

  publish(pageKey: string, sectionKey: string, updatedById: string): Promise<ContentBlockAdminRow> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.contentBlock.findUniqueOrThrow({
        where: { pageKey_sectionKey: { pageKey, sectionKey } },
      });
      return tx.contentBlock.update({
        where: { pageKey_sectionKey: { pageKey, sectionKey } },
        data: {
          publishedValue: row.draftValue as Prisma.InputJsonValue,
          publishedAt: new Date(),
          updatedById,
        },
        select: ADMIN_SELECT,
      });
    });
  }
}
