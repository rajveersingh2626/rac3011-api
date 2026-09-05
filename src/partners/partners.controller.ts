import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReorderDto } from '../common/dto/reorder.dto';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { PartnersService } from './partners.service';
import { partnerAdminDto } from './partners.transformer';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';

@ApiTags('partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list() {
    return { items: (await this.partners.list()).map(partnerAdminDto) };
  }

  @Post()
  @RequirePermission('public_content:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreatePartnerDto) {
    return partnerAdminDto(await this.partners.create(ctx.user.id, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    return partnerAdminDto(await this.partners.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.partners.remove(ctx.user.id, id);
  }

  @Post('reorder')
  @RequirePermission('public_content:manage')
  async reorder(@CurrentUser() ctx: RequestContext, @Body() dto: ReorderDto) {
    return { items: (await this.partners.reorder(ctx.user.id, dto.ids)).map(partnerAdminDto) };
  }
}
