import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/access.decorators';
import { env } from '../../config/env';
import { extractClientIp, readCookie, serializeCookie } from '../../auth/cookie.util';
import { PARTICIPANT_SESSION_TTL_SECONDS, RideAuthService } from './ride-auth.service';
import { ParticipantAuthGuard, PARTICIPANT_COOKIE_NAME } from './guards/participant-auth.guard';
import { CurrentParticipant } from './decorators/current-participant.decorator';

interface LoginDto {
  email?: string;
  identifier?: string;
  password: string;
}

@ApiTags('ride')
@Controller('ride/auth')
export class RideAuthController {
  constructor(private readonly authService: RideAuthService) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const identifier = body.email || body.identifier;
    if (!identifier || !body.password) {
      throw new Error('Email/Rotary ID and password are required');
    }

    const clientIp = extractClientIp(req);
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

    const { participant, token, session } = await this.authService.login(
      identifier,
      body.password,
      clientIp,
      userAgent,
    );

    // Set dedicated HTTP-only participant cookie with 2-hour rolling inactivity maxAge
    const cookieDomain = env.NODE_ENV === 'test' ? undefined : env.COOKIE_DOMAIN;
    const isSecure = env.NODE_ENV === 'production';
    const cookieHeader = serializeCookie(PARTICIPANT_COOKIE_NAME, token, {
      maxAgeSeconds: PARTICIPANT_SESSION_TTL_SECONDS, // 2 hours
      domain: cookieDomain ?? 'localhost',
      secure: isSecure,
    });
    res.setHeader('Set-Cookie', cookieHeader);

    return { participant, token, session };
  }

  @Get('me')
  @Public()
  @UseGuards(ParticipantAuthGuard)
  async me(@CurrentParticipant() participant: any) {
    return { participant };
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    let token = readCookie(req.headers.cookie, PARTICIPANT_COOKIE_NAME);
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7).trim();
    }
    if (token) {
      await this.authService.invalidateSession(token);
    }

    const cookieDomain = env.NODE_ENV === 'test' ? undefined : env.COOKIE_DOMAIN;
    const cookieHeader = serializeCookie(PARTICIPANT_COOKIE_NAME, '', {
      maxAgeSeconds: 0,
      domain: cookieDomain ?? 'localhost',
      secure: env.NODE_ENV === 'production',
    });
    res.setHeader('Set-Cookie', cookieHeader);
    return { success: true };
  }
}
