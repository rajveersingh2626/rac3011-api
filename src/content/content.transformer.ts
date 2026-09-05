import type { LinkCheckStatus } from '../link-health/link-checker.port';
import type { ContentBlockAdminRow } from './content.types';

export function contentBlockAdminDto(row: ContentBlockAdminRow, linkStatus?: LinkCheckStatus) {
  return {
    pageKey: row.pageKey,
    sectionKey: row.sectionKey,
    type: row.type,
    draftValue: row.draftValue,
    publishedValue: row.publishedValue,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedById: row.updatedById,
    ...(linkStatus ? { linkStatus } : {}),
  };
}
