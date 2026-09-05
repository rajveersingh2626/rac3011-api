import { describe, expect, it, vi } from 'vitest';
import { SettingsService } from './settings.service';
import type { SettingRow } from './settings.repository';

function fakeRepo(initial: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(initial));
  const presidents = new Map<string, string[]>();
  return {
    findAll: vi.fn(async (): Promise<SettingRow[]> =>
      [...store.entries()].map(([key, value]) => ({ key, value })),
    ),
    findMany: vi.fn(async (keys: string[]): Promise<SettingRow[]> =>
      keys.filter((k) => store.has(k)).map((key) => ({ key, value: store.get(key) })),
    ),
    upsertMany: vi.fn(async (entries: { key: string; value: unknown }[]) => {
      for (const e of entries) store.set(e.key, e.value);
    }),
    findClubPresidentUserIds: vi.fn(async (clubId: string) => presidents.get(clubId) ?? []),
    presidents,
    store,
  };
}

function fakeRoles(roleId = 'role-mission3011-admin') {
  const grants = new Map<
    string,
    { id: string; userId: string; roleId: string; scopeType: string; scopeId: string | null }
  >();
  let seq = 0;
  return {
    getRoleByKey: vi.fn(async (key: string) =>
      key === 'project_admin:mission3011' ? { id: roleId, key, scopeType: 'project' } : null,
    ),
    findExistingGrant: vi.fn(
      async (userId: string, rId: string, scopeType: string, scopeId: string | null) =>
        [...grants.values()].find(
          (g) =>
            g.userId === userId &&
            g.roleId === rId &&
            g.scopeType === scopeType &&
            g.scopeId === scopeId,
        ) ?? null,
    ),
    grantUserRole: vi.fn(
      async (
        _actorId: string,
        input: { userId: string; roleId: string; scopeType: string; scopeId?: string },
      ) => {
        const id = `grant-${++seq}`;
        grants.set(id, {
          id,
          userId: input.userId,
          roleId: input.roleId,
          scopeType: input.scopeType,
          scopeId: input.scopeId ?? null,
        });
        return { id };
      },
    ),
    revokeUserRole: vi.fn(async (_actorId: string, id: string) => void grants.delete(id)),
    grants,
  };
}

function fakeAudit() {
  return { record: vi.fn(async () => undefined) };
}

describe('SettingsService.update', () => {
  it('rejects an unknown setting key', async () => {
    const service = new SettingsService(
      fakeRepo() as never,
      fakeRoles() as never,
      fakeAudit() as never,
    );
    await expect(service.update('actor-1', { 'not.a.real.key': true })).rejects.toThrow();
  });

  it('rejects an invalid value for a known key', async () => {
    const service = new SettingsService(
      fakeRepo() as never,
      fakeRoles() as never,
      fakeAudit() as never,
    );
    await expect(service.update('actor-1', { 'report.deadlineDay': 99 })).rejects.toThrow();
  });

  it('writes a valid setting and returns the full settings map', async () => {
    const repo = fakeRepo();
    const service = new SettingsService(repo as never, fakeRoles() as never, fakeAudit() as never);
    const result = await service.update('actor-1', { 'report.deadlineDay': 10 });
    expect(result['report.deadlineDay']).toBe(10);
  });

  it('grants project_admin to the new lead club president when leadClubId is set', async () => {
    const repo = fakeRepo();
    repo.presidents.set('CLUB-B', ['user-president-b']);
    const roles = fakeRoles();
    const service = new SettingsService(repo as never, roles as never, fakeAudit() as never);

    await service.update('actor-1', { 'subdomain.mission3011.leadClubId': 'CLUB-B' });

    expect(roles.grantUserRole).toHaveBeenCalledWith(
      'actor-1',
      expect.objectContaining({
        userId: 'user-president-b',
        scopeType: 'project',
        scopeId: 'mission3011',
      }),
    );
  });

  it('revokes the previous lead club president when the lead club changes', async () => {
    const repo = fakeRepo();
    repo.presidents.set('CLUB-A', ['user-president-a']);
    repo.presidents.set('CLUB-B', ['user-president-b']);
    const roles = fakeRoles();
    const service = new SettingsService(repo as never, roles as never, fakeAudit() as never);

    await service.update('actor-1', { 'subdomain.mission3011.leadClubId': 'CLUB-A' });
    expect(roles.grants.size).toBe(1);

    await service.update('actor-1', { 'subdomain.mission3011.leadClubId': 'CLUB-B' });

    expect(roles.revokeUserRole).toHaveBeenCalled();
    const remaining = [...roles.grants.values()];
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ userId: 'user-president-b' });
  });

  it('revokes the lead club president when leadClubId is cleared to null', async () => {
    const repo = fakeRepo();
    repo.presidents.set('CLUB-A', ['user-president-a']);
    const roles = fakeRoles();
    const service = new SettingsService(repo as never, roles as never, fakeAudit() as never);

    await service.update('actor-1', { 'subdomain.mission3011.leadClubId': 'CLUB-A' });
    expect(roles.grants.size).toBe(1);

    await service.update('actor-1', { 'subdomain.mission3011.leadClubId': null });

    expect(roles.grants.size).toBe(0);
  });
});
