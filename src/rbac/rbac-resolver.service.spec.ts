import { describe, expect, it } from 'vitest';
import { RbacResolverService } from './rbac-resolver.service';
import { PERMISSION_KEYS } from '../common/types/permission-keys';

describe('RbacResolverService.fromGrants', () => {
  it('unions grants across roles and collects scopes per permission', () => {
    const access = RbacResolverService.fromGrants('u1', [
      {
        roleKey: 'member',
        scopeType: 'club',
        scopeId: 'A',
        permissionKeys: ['clubs:view', 'profile:edit'],
      },
      {
        roleKey: 'president',
        scopeType: 'club',
        scopeId: 'A',
        permissionKeys: ['clubs:view', 'reports:submit'],
      },
      {
        roleKey: 'zrr',
        scopeType: 'zone',
        scopeId: 'Z1',
        permissionKeys: ['clubs:view', 'reports:review'],
      },
    ]);
    expect(access.isSuperAdmin).toBe(false);
    expect(access.roles).toHaveLength(3);
    expect(access.grants['clubs:view']).toEqual([
      { type: 'club', id: 'A' },
      { type: 'zone', id: 'Z1' },
    ]);
    expect(access.grants['reports:submit']).toEqual([{ type: 'club', id: 'A' }]);
    expect(access.grants['reports:review']).toEqual([{ type: 'zone', id: 'Z1' }]);
    expect(access.grants['audit:view']).toBeUndefined();
  });

  it('short-circuits for super admin with every permission at district scope', () => {
    const access = RbacResolverService.fromGrants('u1', [
      { roleKey: 'super_admin', scopeType: 'none', scopeId: null, permissionKeys: [] },
    ]);
    expect(access.isSuperAdmin).toBe(true);
    for (const key of PERMISSION_KEYS) expect(access.grants[key]).toEqual([{ type: 'none' }]);
  });

  it('ignores unknown permission keys and maps none scope without id', () => {
    const access = RbacResolverService.fromGrants('u1', [
      {
        roleKey: 'dsc',
        scopeType: 'none',
        scopeId: null,
        permissionKeys: ['audit:view', 'not:a_key'],
      },
    ]);
    expect(access.grants['audit:view']).toEqual([{ type: 'none' }]);
    expect(Object.keys(access.grants)).toEqual(['audit:view']);
    expect(access.roles[0].scope).toEqual({ type: 'none' });
  });
});
