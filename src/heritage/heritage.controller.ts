import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReorderDto } from '../common/dto/reorder.dto';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { HeritageService } from './heritage.service';
import { pastDrrAdminDto } from './heritage.transformer';
import { CreatePastDrrDto, UpdatePastDrrDto } from './dto/past-drr.dto';

@ApiTags('past-drrs')
@Controller('past-drrs')
export class PastDrrsController {
  constructor(private readonly heritage: HeritageService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list() {
    return { items: (await this.heritage.list()).map(pastDrrAdminDto) };
  }

  @Post()
  @RequirePermission('public_content:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreatePastDrrDto) {
    return pastDrrAdminDto(await this.heritage.create(ctx.user.id, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdatePastDrrDto,
  ) {
    return pastDrrAdminDto(await this.heritage.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.heritage.remove(ctx.user.id, id);
  }

  @Post('reorder')
  @RequirePermission('public_content:manage')
  async reorder(@CurrentUser() ctx: RequestContext, @Body() dto: ReorderDto) {
    return { items: (await this.heritage.reorder(ctx.user.id, dto.ids)).map(pastDrrAdminDto) };
  }
}
