import { Injectable } from '@nestjs/common';
import type { PermissionKey } from '../common/types/permission-keys';
import { PERMISSION_KEYS, isPermissionKey } from '../common/types/permission-keys';
import type { ResolvedAccess, Scope } from '../common/types/access';
import { RbacRepository, UserRoleGrant } from './rbac.repository';

export const SUPER_ADMIN_ROLE_KEY = 'super_admin';

@Injectable()
export class RbacResolverService {
  constructor(private readonly repo: RbacRepository) {}

  async resolve(userId: string): Promise<ResolvedAccess> {
    return RbacResolverService.fromGrants(userId, await this.repo.findGrantsForUser(userId));
  }

  static fromGrants(userId: string, rows: UserRoleGrant[]): ResolvedAccess {
    const roles = rows.map((r) => ({ roleKey: r.roleKey, scope: toScope(r) }));
    const isSuperAdmin = rows.some((r) => r.roleKey === SUPER_ADMIN_ROLE_KEY);
    const grants: Partial<Record<PermissionKey, Scope[]>> = {};
    if (isSuperAdmin) {
      for (const key of PERMISSION_KEYS) grants[key] = [{ type: 'none' }];
      return { userId, isSuperAdmin, roles, grants };
    }
    for (const row of rows) {
      const scope = toScope(row);
      for (const key of row.permissionKeys) {
        if (!isPermissionKey(key)) continue;
        const list = grants[key] ?? [];
        if (!list.some((s) => s.type === scope.type && s.id === scope.id)) list.push(scope);
        grants[key] = list;
      }
    }
    return { userId, isSuperAdmin, roles, grants };
  }
}

function toScope(row: UserRoleGrant): Scope {
  return row.scopeType === 'none'
    ? { type: 'none' }
    : { type: row.scopeType, id: row.scopeId ?? undefined };
}
