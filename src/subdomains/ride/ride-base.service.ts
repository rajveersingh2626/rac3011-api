import { ForbiddenException, Injectable } from '@nestjs/common';
import { ScopeService } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';

export const RIDE_MANAGE_PERMISSION = 'subdomain:ride:manage' as const;

@Injectable()
export abstract class RideBaseManagerService {
  constructor(protected readonly scope: ScopeService) {}

  protected assertManage(ctx: RequestContext): void {
    if (!this.hasManageGrant(ctx)) throw new ForbiddenException();
    this.scope.assertCanAccessProject(ctx.access, RIDE_MANAGE_PERMISSION, 'ride');
  }

  protected hasManageGrant(ctx: RequestContext): boolean {
    return ctx.access.isSuperAdmin || (ctx.access.grants[RIDE_MANAGE_PERMISSION] ?? []).length > 0;
  }
}
