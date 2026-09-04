import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { ResolvedSession, SessionContextPort } from '../common/auth/session-context.port';
import type { AuthApi } from './auth-api.types';
import { AuthRepository } from './auth.repository';
import { readCookie, sha256Hex, toWebHeaders } from './cookie.util';

export const TRUSTED_DEVICE_COOKIE = 'trusted_device';

@Injectable()
export class SessionContextAdapter extends SessionContextPort {
  constructor(
    private readonly authService: AuthService,
    private readonly repo: AuthRepository,
  ) {
    super();
  }

  async fromRequest(req: Request): Promise<ResolvedSession | null> {
    const session = await this.api().getSession({ headers: toWebHeaders(req.headers) });
    if (!session) return null;

    let mfaPending = session.session.mfaPending;
    if (mfaPending) {
      const cookie = readCookie(req.headers.cookie, TRUSTED_DEVICE_COOKIE);
      if (cookie && (await this.repo.hasValidTrustedDevice(session.user.id, sha256Hex(cookie)))) {
        await this.repo.setSessionMfaPending(session.session.id, false);
        mfaPending = false;
      }
    }

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        twoFactorEnabled: session.user.twoFactorEnabled,
      },
      sessionId: session.session.id,
      mfaPending,
    };
  }

  private api(): AuthApi {
    return this.authService.instance.api as unknown as AuthApi;
  }
}
