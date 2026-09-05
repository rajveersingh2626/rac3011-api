import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../common/types/access';
import { LinkHealthService } from '../link-health/link-health.service';
import type { LinkCheckStatus } from '../link-health/link-checker.port';
import { ContentRepository } from './content.repository';
import { contentBlockAdminDto } from './content.transformer';
import type { PatchContentBlockInput } from './dto/patch-content-block.dto';
import type { ContentBlockAdminRow, ContentBlockType } from './content.types';

export type PublicContentBlocks = Record<string, { type: string; value: unknown }>;

function extractAssetUrl(type: ContentBlockType, value: unknown): string | undefined {
  if (type !== 'image' && type !== 'link') return undefined;
  if (typeof value === 'string' && value.length > 0) return value;
  if (value && typeof value === 'object' && typeof (value as { url?: unknown }).url === 'string') {
    return (value as { url: string }).url;
  }
  return undefined;
}

@Injectable()
export class ContentService {
  constructor(
    private readonly repo: ContentRepository,
    private readonly linkHealth: LinkHealthService,
    private readonly audit: AuditService,
  ) {}

  async publishedBlocks(pageKey: string): Promise<PublicContentBlocks> {
    const rows = await this.repo.findPublishedBlocks(pageKey);
    const out: PublicContentBlocks = {};
    for (const row of rows) out[row.sectionKey] = { type: row.type, value: row.publishedValue };
    return out;
  }

  async setting<T>(key: string, fallback: T): Promise<T> {
    const value = await this.repo.getSetting(key);
    return value === undefined ? fallback : (value as T);
  }

  async listBlocks(pageKey?: string) {
    const rows = await this.repo.findMany(pageKey);
    return rows.map((row) => contentBlockAdminDto(row));
  }

  async editBlock(
    ctx: RequestContext,
    pageKey: string,
    sectionKey: string,
    dto: PatchContentBlockInput,
  ) {
    if (dto.publish) {
      const canPublish =
        ctx.access.isSuperAdmin || (ctx.access.grants['content:publish'] ?? []).length > 0;
      if (!canPublish) throw new ForbiddenException('content:publish is required to publish');
    }

    let row: ContentBlockAdminRow | null;
    if (dto.type !== undefined || dto.draftValue !== undefined) {
      row = await this.repo.upsertDraft(
        pageKey,
        sectionKey,
        { type: dto.type, draftValue: dto.draftValue },
        ctx.user.id,
      );
    } else {
      row = await this.repo.findOne(pageKey, sectionKey);
    }
    if (!row) throw new NotFoundException();

    let linkStatus: LinkCheckStatus | undefined;
    const url = extractAssetUrl(row.type, row.draftValue);
    if (url) {
      linkStatus = await this.linkHealth.checkAndTrack({
        url,
        kind: row.type,
        ownerUserId: ctx.user.id,
        resourceType: 'content_block',
        resourceId: `${pageKey}:${sectionKey}`,
      });
    }

    if (dto.publish) {
      const before = { draftValue: row.draftValue, publishedAt: row.publishedAt };
      row = await this.repo.publish(pageKey, sectionKey, ctx.user.id);
      await this.audit.record({
        actorId: ctx.user.id,
        action: 'content.published',
        resourceType: 'content_block',
        resourceId: `${pageKey}:${sectionKey}`,
        before,
        after: { publishedValue: row.publishedValue, publishedAt: row.publishedAt },
      });
    }

    return contentBlockAdminDto(row, linkStatus);
  }
}
