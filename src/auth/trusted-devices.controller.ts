import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { TrustedDevicesService } from './trusted-devices.service';

@ApiTags('auth')
@Controller('trusted-devices')
export class TrustedDevicesController {
  constructor(private readonly trustedDevices: TrustedDevicesService) {}

  @Get()
  @Authenticated()
  list(@CurrentUser() ctx: RequestContext) {
    return this.trustedDevices.list(ctx.user.id);
  }

  @Delete(':id')
  @Authenticated()
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.trustedDevices.revoke(ctx.user.id, id);
  }
}
