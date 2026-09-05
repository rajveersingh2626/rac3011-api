import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '../common/types/access';
import type { ContentRepository } from './content.repository';
import { ContentService } from './content.service';
import type { ContentBlockAdminRow } from './content.types';
import type { LinkHealthService } from '../link-health/link-health.service';
import type { AuditService } from '../audit/audit.service';

function ctxWith(grants: Record<string, { type: string }[]>): RequestContext {
  return {
    user: { id: 'user-1', name: 'Editor', email: 'editor@example.com', twoFactorEnabled: false },
    sessionId: 's1',
    access: { userId: 'user-1', isSuperAdmin: false, roles: [], grants },
  };
}

function fakeRepo(initial?: ContentBlockAdminRow) {
  let row: ContentBlockAdminRow | null = initial ?? null;
  return {
    findMany: vi.fn(() => (row ? [row] : [])),
    findOne: vi.fn(() => row),
    upsertDraft: vi.fn(
      (
        pageKey: string,
        sectionKey: string,
        data: { type?: string; draftValue?: unknown },
        updatedById: string,
      ) => {
        row = {
          id: 'cb-1',
          pageKey,
          sectionKey,
          type: (data.type ?? row?.type ?? 'text') as ContentBlockAdminRow['type'],
          draftValue: data.draftValue !== undefined ? data.draftValue : (row?.draftValue ?? null),
          publishedValue: row?.publishedValue ?? null,
          publishedAt: row?.publishedAt ?? null,
          updatedById,
        };
        return row;
      },
    ),
    publish: vi.fn((pageKey: string, sectionKey: string, updatedById: string) => {
      if (!row) throw new Error('no row');
      row = {
        ...row,
        publishedValue: row.draftValue,
        publishedAt: new Date('2026-09-05'),
        updatedById,
      };
      return row;
    }),
  } as unknown as ContentRepository;
}

function fakeLinkHealth() {
  return { checkAndTrack: vi.fn(async () => 'ok' as const) };
}

function fakeAudit() {
  const records: unknown[] = [];
  return {
    record: vi.fn(async (input: unknown) => void records.push(input)),
    records,
  } as unknown as AuditService & { records: unknown[] };
}

describe('ContentService.editBlock', () => {
  it('saves a draft without publishing when publish is omitted', async () => {
    const repo = fakeRepo();
    const linkHealth = fakeLinkHealth();
    const audit = fakeAudit();
    const service = new ContentService(repo, linkHealth as unknown as LinkHealthService, audit);

    const result = await service.editBlock(
      ctxWith({ 'content:edit': [{ type: 'none' }] }),
      'home',
      'hero_title',
      { type: 'text', draftValue: 'New title' },
    );

    expect(result.draftValue).toBe('New title');
    expect(result.publishedAt).toBeNull();
    expect(audit.records).toHaveLength(0);
  });

  it('rejects publish for a caller without content:publish', async () => {
    const repo = fakeRepo();
    const service = new ContentService(
      repo,
      fakeLinkHealth() as unknown as LinkHealthService,
      fakeAudit(),
    );

    await expect(
      service.editBlock(ctxWith({ 'content:edit': [{ type: 'none' }] }), 'home', 'hero_title', {
        draftValue: 'x',
        publish: true,
      }),
    ).rejects.toThrow();
  });

  it('publishes and audits when the caller holds content:publish', async () => {
    const repo = fakeRepo();
    const audit = fakeAudit();
    const service = new ContentService(
      repo,
      fakeLinkHealth() as unknown as LinkHealthService,
      audit,
    );

    const result = await service.editBlock(
      ctxWith({ 'content:edit': [{ type: 'none' }], 'content:publish': [{ type: 'none' }] }),
      'home',
      'hero_title',
      { type: 'text', draftValue: 'Published title', publish: true },
    );

    expect(result.publishedValue).toBe('Published title');
    expect(result.publishedAt).not.toBeNull();
    expect(audit.records).toHaveLength(1);
    expect(audit.records[0]).toMatchObject({ action: 'content.published' });
  });

  it('checks and tracks the link for image/link blocks, returning linkStatus', async () => {
    const repo = fakeRepo();
    const linkHealth = fakeLinkHealth();
    const service = new ContentService(
      repo,
      linkHealth as unknown as LinkHealthService,
      fakeAudit(),
    );

    const result = await service.editBlock(
      ctxWith({ 'content:edit': [{ type: 'none' }] }),
      'about',
      'hero_image',
      { type: 'image', draftValue: { url: 'https://example.org/hero.jpg' } },
    );

    expect(linkHealth.checkAndTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.org/hero.jpg',
        resourceType: 'content_block',
      }),
    );
    expect(result.linkStatus).toBe('ok');
  });
});
