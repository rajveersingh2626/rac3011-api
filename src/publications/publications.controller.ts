import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { PublicationsService } from './publications.service';
import { publicationDto } from './publications.transformer';
import { CreatePublicationDto, UpdatePublicationDto } from './dto/publication.dto';

@ApiTags('publications')
@Controller('publications')
export class PublicationsController {
  constructor(private readonly publications: PublicationsService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list() {
    return { items: (await this.publications.list()).map(publicationDto) };
  }

  @Post()
  @RequirePermission('public_content:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreatePublicationDto) {
    return publicationDto(await this.publications.create(ctx.user.id, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdatePublicationDto,
  ) {
    return publicationDto(await this.publications.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.publications.remove(ctx.user.id, id);
  }
}
