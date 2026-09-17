import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/access.decorators';
import { env } from '../../config/env';
import { serializeCookie } from '../../auth/cookie.util';
import { RideAuthService } from './ride-auth.service';
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const identifier = body.email || body.identifier;
    if (!identifier || !body.password) {
      throw new Error('Email/Rotary ID and password are required');
    }

    const { participant, token } = await this.authService.login(identifier, body.password);

    // Set dedicated HTTP-only participant cookie
    const cookieDomain = env.NODE_ENV === 'test' ? undefined : env.COOKIE_DOMAIN;
    const isSecure = env.NODE_ENV === 'production';
    const cookieHeader = serializeCookie(PARTICIPANT_COOKIE_NAME, token, {
      maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      domain: cookieDomain ?? 'localhost',
      secure: isSecure,
    });
    res.setHeader('Set-Cookie', cookieHeader);

    return { participant, token };
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
  async logout(@Res({ passthrough: true }) res: Response) {
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
