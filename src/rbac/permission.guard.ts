import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  AUTHENTICATED_KEY,
  PUBLIC_KEY,
  REQUIRE_PERMISSION_KEY,
  SECOND_FACTOR_STAGE_KEY,
} from '../common/decorators/access.decorators';
import { SessionContextPort } from '../common/auth/session-context.port';
import type { PermissionKey } from '../common/types/permission-keys';
import type { RequestContext } from '../common/types/access';
import { RbacResolverService } from './rbac-resolver.service';

type AuthedRequest = Request & { rac3011?: RequestContext };

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionContextPort,
    private readonly resolver: RbacResolverService,
  ) {}

  private meta<T>(key: string, ctx: ExecutionContext): T | undefined {
    return this.reflector.getAllAndOverride<T>(key, [ctx.getHandler(), ctx.getClass()]);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    if (this.meta<boolean>(PUBLIC_KEY, ctx)) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const session = await this.sessions.fromRequest(req);
    if (!session) throw new UnauthorizedException();

    const secondFactorStage = this.meta<boolean>(SECOND_FACTOR_STAGE_KEY, ctx) === true;
    if (session.mfaPending && !secondFactorStage)
      throw new UnauthorizedException('Second factor required');

    const access = await this.resolver.resolve(session.user.id);
    req.rac3011 = { user: session.user, sessionId: session.sessionId, access };

    const permissions = this.meta<PermissionKey[]>(REQUIRE_PERMISSION_KEY, ctx);
    if (!permissions || permissions.length === 0) {
      if (secondFactorStage || this.meta<boolean>(AUTHENTICATED_KEY, ctx)) return true;
      throw new ForbiddenException();
    }
    if (access.isSuperAdmin) return true;
    if (!permissions.some((p) => (access.grants[p] ?? []).length > 0))
      throw new ForbiddenException();
    return true;
  }
}
