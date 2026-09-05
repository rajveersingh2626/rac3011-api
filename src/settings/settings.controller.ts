import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequirePermission('settings:manage')
  list() {
    return this.settings.listAll();
  }

  @Patch()
  @RequirePermission('settings:manage')
  update(@CurrentUser() ctx: RequestContext, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(ctx.user.id, dto);
  }
}
