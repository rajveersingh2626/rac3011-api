import { describe, expect, it, vi } from 'vitest';
import type { NotifyInput } from '../notifications/notification.port';
import type { LinkCheckStatus } from './link-checker.port';
import { LinkHealthService } from './link-health.service';
import type { AssetLinkRow } from './link-health.repository';

function fakeRepo(rows: AssetLinkRow[]) {
  const store = new Map(rows.map((r) => [r.id, { ...r }]));
  return {
    findAll: vi.fn(() => [...store.values()]),
    findById: vi.fn((id: string) => store.get(id) ?? null),
    updateStatus: vi.fn((id: string, status: LinkCheckStatus) => {
      const row = store.get(id);
      if (row) row.status = status;
    }),
    store,
  };
}

function fakeChecker(result: LinkCheckStatus | LinkCheckStatus[]) {
  const queue = Array.isArray(result) ? [...result] : undefined;
  return { check: vi.fn(() => (queue ? (queue.shift() ?? result) : result)) };
}

function fakeNotifications() {
  const sent: NotifyInput[] = [];
  return { notify: vi.fn((input: NotifyInput) => void sent.push(input)), sent };
}

describe('LinkHealthService', () => {
  it('notifies the owner once when a link transitions to broken, not on rerun', async () => {
    const repo = fakeRepo([
      {
        id: 'l1',
        url: 'https://drive.google.com/file/d/abc/view',
        status: 'unchecked',
        ownerUserId: 'user-1',
      },
    ]);
    const checker = fakeChecker('broken');
    const notifications = fakeNotifications();
    // @ts-expect-error partial fakes are sufficient for this unit test
    const service = new LinkHealthService(repo, checker, notifications);

    const first = await service.recheckAll();
    expect(first).toEqual({ checked: 1, transitioned: 1 });
    expect(notifications.sent).toHaveLength(1);
    expect(notifications.sent[0]).toMatchObject({
      template: 'link-broken',
      to: [{ userId: 'user-1' }],
    });

    const second = await service.recheckAll();
    expect(second).toEqual({ checked: 1, transitioned: 0 });
    expect(notifications.sent).toHaveLength(1);
  });

  it('does not notify when a link stays ok', async () => {
    const repo = fakeRepo([
      { id: 'l2', url: 'https://example.org/doc.pdf', status: 'unchecked', ownerUserId: 'user-2' },
    ]);
    const checker = fakeChecker('ok');
    const notifications = fakeNotifications();
    // @ts-expect-error partial fakes are sufficient for this unit test
    const service = new LinkHealthService(repo, checker, notifications);

    await service.recheckAll();
    expect(notifications.sent).toHaveLength(0);
    expect(repo.store.get('l2')?.status).toBe('ok');
  });

  it('notifies on a private transition and skips when there is no owner', async () => {
    const repo = fakeRepo([
      {
        id: 'l3',
        url: 'https://drive.google.com/file/d/xyz/view',
        status: 'ok',
        ownerUserId: null,
      },
    ]);
    const checker = fakeChecker('private');
    const notifications = fakeNotifications();
    // @ts-expect-error partial fakes are sufficient for this unit test
    const service = new LinkHealthService(repo, checker, notifications);

    const result = await service.recheckAll();
    expect(result.transitioned).toBe(1);
    expect(notifications.sent).toHaveLength(0);
    expect(repo.store.get('l3')?.status).toBe('private');
  });

  it('recheckOne updates a single link', async () => {
    const repo = fakeRepo([
      { id: 'l4', url: 'https://example.org/x', status: 'ok', ownerUserId: 'user-4' },
    ]);
    const checker = fakeChecker('broken');
    const notifications = fakeNotifications();
    // @ts-expect-error partial fakes are sufficient for this unit test
    const service = new LinkHealthService(repo, checker, notifications);

    await service.recheckOne('l4');
    expect(repo.store.get('l4')?.status).toBe('broken');
    expect(notifications.sent).toHaveLength(1);
  });
});
