import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ScopeService } from './scope.service';
import type { ScopeRepository } from './scope.repository';
import type { ResolvedAccess } from '../types/access';

const repo = {
  findZoneIdOfClub: (clubId: string) => Promise.resolve({ A: 'Z1', B: 'Z1', C: 'Z2' }[clubId]),
  findClubIdsInZones: (zoneIds: string[]) =>
    Promise.resolve(zoneIds.includes('Z1') ? ['A', 'B'] : []),
} as unknown as ScopeRepository;

const access = (grants: ResolvedAccess['grants'], isSuperAdmin = false): ResolvedAccess => ({
  userId: 'u',
  isSuperAdmin,
  roles: [],
  grants,
});

describe('ScopeService', () => {
  const svc = new ScopeService(repo);

  it('allows club-scoped grant only for its club', async () => {
    const a = access({ 'clubs:view': [{ type: 'club', id: 'A' }] });
    await expect(svc.assertCanAccessClub(a, 'clubs:view', 'A')).resolves.toBeUndefined();
    await expect(svc.assertCanAccessClub(a, 'clubs:view', 'B')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resolves zone scope through the club zone', async () => {
    const a = access({ 'reports:review': [{ type: 'zone', id: 'Z1' }] });
    await expect(svc.canAccessClub(a, 'reports:review', 'B')).resolves.toBe(true);
    await expect(svc.canAccessClub(a, 'reports:review', 'C')).resolves.toBe(false);
    await expect(svc.canAccessClub(a, 'reports:review', 'missing')).resolves.toBe(false);
  });

  it('district scope and super admin pass everything', async () => {
    await expect(
      svc.canAccessClub(access({ 'clubs:view': [{ type: 'none' }] }), 'clubs:view', 'C'),
    ).resolves.toBe(true);
    await expect(svc.canAccessClub(access({}, true), 'clubs:view', 'C')).resolves.toBe(true);
    expect(svc.canAccessProject(access({}, true), 'subdomain:rcl:manage', 'rcl')).toBe(true);
  });

  it('denies when the permission is not granted at all', async () => {
    await expect(svc.canAccessClub(access({}), 'clubs:view', 'A')).resolves.toBe(false);
    expect(svc.canAccessProject(access({}), 'subdomain:rcl:manage', 'rcl')).toBe(false);
  });

  it('project scope matches only its project key', () => {
    const a = access({ 'subdomain:rcl:manage': [{ type: 'project', id: 'rcl' }] });
    expect(svc.canAccessProject(a, 'subdomain:rcl:manage', 'rcl')).toBe(true);
    expect(() => svc.assertCanAccessProject(a, 'subdomain:rcl:manage', 'ride')).toThrow(
      NotFoundException,
    );
  });

  it('clubFilter unions club and zone scopes and narrows, never widens', async () => {
    const a = access({
      'clubs:view': [
        { type: 'club', id: 'C' },
        { type: 'zone', id: 'Z1' },
      ],
    });
    const f = await svc.clubFilter(a, 'clubs:view');
    expect(f).toEqual({ clubIds: ['C', 'A', 'B'] });
    expect(ScopeService.narrowClubs(f, 'A')).toEqual({ clubIds: ['A'] });
    expect(ScopeService.narrowClubs(f, 'X')).toEqual({ clubIds: [] });
    expect(ScopeService.narrowClubs({ all: true }, 'X')).toEqual({ clubIds: ['X'] });
    await expect(svc.clubFilter(access({}), 'clubs:view')).resolves.toEqual({ clubIds: [] });
    await expect(
      svc.clubFilter(access({ 'clubs:view': [{ type: 'none' }] }), 'clubs:view'),
    ).resolves.toEqual({ all: true });
  });
});
