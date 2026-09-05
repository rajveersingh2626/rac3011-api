import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../../common/query/list-query';
import type { RequestContext } from '../../common/types/access';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { RideGalleryService } from './ride-gallery.service';
import { galleryItemDto } from './ride.transformer';

const FILTERS = ['year'] as const;

@ApiTags('ride')
@Controller('ride/gallery-items')
export class RideGalleryController {
  constructor(private readonly service: RideGalleryService) {}

  @Get()
  @RequirePermission('subdomain:ride:manage')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const year = q.filter.year ? Number(q.filter.year) : undefined;
    const { items, total } = await this.service.list({ year }, q.page, q.pageSize);
    return paginate(items.map(galleryItemDto), total, q);
  }

  @Post()
  @RequirePermission('subdomain:ride:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateGalleryItemDto) {
    return galleryItemDto(await this.service.create(ctx, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('subdomain:ride:manage')
  async delete(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.service.delete(ctx, id);
  }
}
