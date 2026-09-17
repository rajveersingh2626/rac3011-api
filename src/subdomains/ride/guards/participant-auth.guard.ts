import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { readCookie } from '../../../auth/cookie.util';
import { RideAuthService } from '../ride-auth.service';

export const PARTICIPANT_COOKIE_NAME = 'rac3011.participant_session';

@Injectable()
export class ParticipantAuthGuard implements CanActivate {
  constructor(private readonly authService: RideAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    
    // Check dedicated participant cookie first, then Bearer token
    let token = readCookie(req.headers.cookie, PARTICIPANT_COOKIE_NAME);
    if (!token && req.headers.authorization) {
      const auth = req.headers.authorization;
      if (auth.startsWith('Bearer ')) {
        token = auth.slice(7).trim();
      }
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required: no active participant session found.');
    }

    const participant = await this.authService.getParticipantFromToken(token);
    (req as any).participant = participant;
    return true;
  }
}
