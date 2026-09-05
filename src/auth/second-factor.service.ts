import { randomBytes } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import type { RequestContext } from '../common/types/access';
import type { AuthApi } from './auth-api.types';
import { AuthRepository } from './auth.repository';
import { serializeCookie, sha256Hex, toWebHeaders } from './cookie.util';
import { TRUSTED_DEVICE_COOKIE } from './session-context.adapter';
import type { VerifySecondFactorInput } from './dto/second-factor.dto';

const RESEND_WINDOW_MS = 10 * 60 * 1000;
const RESEND_MAX = 3;
const TRUSTED_DEVICE_TTL_SECONDS = 5 * 60 * 60;

@Injectable()
export class SecondFactorService {
  private readonly resendAttempts = new Map<string, number[]>();

  constructor(
    private readonly authService: AuthService,
    private readonly repo: AuthRepository,
  ) {}

  async resend(email: string): Promise<void> {
    this.assertResendAllowed(email);
    await this.api().sendVerificationOTP({ body: { email, type: 'sign-in' } });
  }

  async verify(
    req: Request,
    res: Response,
    ctx: RequestContext,
    input: VerifySecondFactorInput,
  ): Promise<void> {
    if (input.method === 'email') {
      const bypassed = env.GLOBAL_OTP !== undefined && input.code === env.GLOBAL_OTP;
      if (!bypassed) {
        const result = await this.api().checkVerificationOTP({
          body: { email: ctx.user.email, type: 'sign-in', otp: input.code },
        });
        if (!result.success) throw new UnauthorizedException('Invalid code');
      }
    } else {
      try {
        await this.api().verifyTOTP({
          body: { code: input.code },
          headers: toWebHeaders(req.headers),
        });
      } catch {
        throw new UnauthorizedException('Invalid code');
      }
    }
    await this.repo.setSessionMfaPending(ctx.sessionId, false);
    if (input.rememberDevice)
      await this.issueTrustedDevice(res, ctx.user.id, req.headers['user-agent']);
  }

  private async issueTrustedDevice(
    res: Response,
    userId: string,
    userAgent: string | undefined,
  ): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_TTL_SECONDS * 1000);
    await this.repo.createTrustedDevice({
      userId,
      tokenHash: sha256Hex(token),
      userAgent: userAgent ?? null,
      expiresAt,
    });
    res.setHeader(
      'Set-Cookie',
      serializeCookie(TRUSTED_DEVICE_COOKIE, token, {
        maxAgeSeconds: TRUSTED_DEVICE_TTL_SECONDS,
        domain: env.COOKIE_DOMAIN,
        secure: env.NODE_ENV !== 'development',
      }),
    );
  }

  private assertResendAllowed(email: string): void {
    const now = Date.now();
    const attempts = (this.resendAttempts.get(email) ?? []).filter(
      (t) => now - t < RESEND_WINDOW_MS,
    );
    if (attempts.length >= RESEND_MAX) {
      throw new HttpException(
        'Too many OTP resend requests, try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    attempts.push(now);
    this.resendAttempts.set(email, attempts);
  }

  private api(): AuthApi {
    return this.authService.instance.api as unknown as AuthApi;
  }
}
