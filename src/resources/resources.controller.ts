import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReorderDto } from '../common/dto/reorder.dto';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { ResourcesService } from './resources.service';
import { resourceAdminDto } from './resources.transformer';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list() {
    return { items: (await this.resources.list()).map(resourceAdminDto) };
  }

  @Post()
  @RequirePermission('public_content:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateResourceDto) {
    return resourceAdminDto(await this.resources.create(ctx.user.id, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return resourceAdminDto(await this.resources.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.resources.remove(ctx.user.id, id);
  }

  @Post('reorder')
  @RequirePermission('public_content:manage')
  async reorder(@CurrentUser() ctx: RequestContext, @Body() dto: ReorderDto) {
    return { items: (await this.resources.reorder(ctx.user.id, dto.ids)).map(resourceAdminDto) };
  }
}
