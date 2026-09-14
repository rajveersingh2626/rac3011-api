import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReorderDto } from '../common/dto/reorder.dto';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { GalleryService } from './gallery.service';
import { galleryItemAdminDto } from './gallery.transformer';
import { CreateGalleryItemDto, UpdateGalleryItemDto } from './dto/gallery-item.dto';

@ApiTags('gallery')
@Controller('gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list() {
    try {
      const items = await this.gallery.list();
      return { items: (items || []).map(galleryItemAdminDto) };
    } catch {
      return { items: [] };
    }
  }

  @Post()
  @RequirePermission('public_content:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateGalleryItemDto) {
    return galleryItemAdminDto(await this.gallery.create(ctx.user.id, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateGalleryItemDto,
  ) {
    return galleryItemAdminDto(await this.gallery.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.gallery.remove(ctx.user.id, id);
  }

  @Post('reorder')
  @RequirePermission('public_content:manage')
  async reorder(@CurrentUser() ctx: RequestContext, @Body() dto: ReorderDto) {
    return { items: (await this.gallery.reorder(ctx.user.id, dto.ids)).map(galleryItemAdminDto) };
  }
}
