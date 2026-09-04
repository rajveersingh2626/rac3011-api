import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
}
