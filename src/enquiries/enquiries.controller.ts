import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { CreateAdminEnquiryDto } from './dto/create-admin-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';
import { enquiryAdminDto } from './enquiries.transformer';
import { EnquiriesService } from './enquiries.service';

const FILTERS = ['status'] as const;

@ApiTags('enquiries')
@Controller('enquiries')
export class EnquiriesAdminController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const items = await this.enquiries.list(q.filter.status);
    return { items: items.map(enquiryAdminDto) };
  }

  @Post()
  @RequirePermission('public_content:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateAdminEnquiryDto) {
    return enquiryAdminDto(await this.enquiries.createAdmin(ctx.user.id, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryDto,
  ) {
    return enquiryAdminDto(await this.enquiries.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.enquiries.remove(ctx.user.id, id);
  }
}
