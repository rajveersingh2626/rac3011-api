import { Body, Controller, Get, Header, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import QRCode from 'qrcode';
import { clubDto } from '../clubs/clubs.transformer';
import { Authenticated } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { UpdateMeDto } from './dto/update-me.dto';
import { MeService } from './me.service';
import { memberProfileDto } from './me.transformer';

@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @Authenticated()
  async get(@CurrentUser() ctx: RequestContext) {
    const profile = await this.me.getProfile(ctx);
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        twoFactorEnabled: ctx.user.twoFactorEnabled,
      },
      profile: profile ? memberProfileDto(profile) : null,
      roles: ctx.access.roles,
      grants: ctx.access.grants,
      clubs: await this.me.clubsInScope(ctx),
      theme: profile?.themePreference ?? 'system',
    };
  }

  @Patch()
  @Authenticated()
  async update(@CurrentUser() ctx: RequestContext, @Body() dto: UpdateMeDto) {
    return memberProfileDto(await this.me.updateProfile(ctx, dto));
  }

  @Get('club')
  @Authenticated()
  async getClub(@CurrentUser() ctx: RequestContext) {
    return clubDto(await this.me.getClub(ctx));
  }

  @Get('card')
  @Authenticated()
  async getCard(@CurrentUser() ctx: RequestContext) {
    return this.me.getCard(ctx);
  }

  @Get('qr.svg')
  @Authenticated()
  @Header('Content-Type', 'image/svg+xml')
  async getQrSvg(@CurrentUser() ctx: RequestContext): Promise<string> {
    const qrToken = await this.me.getQrToken(ctx);
    return QRCode.toString(qrToken, { type: 'svg', margin: 1, width: 256 });
  }

  @Post('privacy-acceptances')
  @Authenticated()
  @HttpCode(200)
  async acceptPrivacyPolicy(@CurrentUser() ctx: RequestContext): Promise<{ accepted: true }> {
    await this.me.acceptPrivacyPolicy(ctx);
    return { accepted: true };
  }
}
