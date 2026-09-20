import { ForbiddenException, Injectable } from '@nestjs/common';
import { ScopeService } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import type { PermissionKey } from '../../common/types/permission-keys';

export const RIDE_MANAGE_PERMISSION = 'subdomain:ride:manage' as const;
export const RIDE_ADMIN_PERMISSIONS: readonly PermissionKey[] = [
  'subdomain:ride:manage',
  'ride:manage',
  'ride:delegates:manage',
] as const;

@Injectable()
export abstract class RideBaseManagerService {
  constructor(protected readonly scope: ScopeService) {}

  protected assertManage(ctx: RequestContext): void {
    if (ctx.access.isSuperAdmin) return;
    if (!this.hasManageGrant(ctx)) throw new ForbiddenException();

    const hasProjectAccess = RIDE_ADMIN_PERMISSIONS.some((perm) =>
      this.scope.canAccessProject(ctx.access, perm, 'ride'),
    );
    if (!hasProjectAccess) throw new ForbiddenException();
  }

  protected hasManageGrant(ctx: RequestContext): boolean {
    if (ctx.access.isSuperAdmin) return true;
    return RIDE_ADMIN_PERMISSIONS.some(
      (perm) => (ctx.access.grants[perm] ?? []).length > 0,
    );
  }
}

