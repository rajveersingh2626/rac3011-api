import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestContext } from '../types/access';

export type AuthedRequest = Request & { rac3011?: RequestContext };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.rac3011)
      throw new Error('CurrentUser used on a route without an authenticated context');
    return req.rac3011;
  },
);
