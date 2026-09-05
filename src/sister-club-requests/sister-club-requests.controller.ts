import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import {
  CreateSisterClubRequestDto,
  UpdateSisterClubRequestDto,
} from './dto/sister-club-request.dto';
import { sisterClubRequestDto } from './sister-club-requests.transformer';
import { SisterClubRequestsService } from './sister-club-requests.service';

const FILTERS = ['status'] as const;

@ApiTags('sister-club-requests')
@Controller('sister-club-requests')
export class SisterClubRequestsController {
  constructor(private readonly requests: SisterClubRequestsService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const items = await this.requests.list(q.filter.status);
    return { items: items.map(sisterClubRequestDto) };
  }

  @Post()
  @RequirePermission('public_content:manage', 'clubs:edit')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateSisterClubRequestDto) {
    return sisterClubRequestDto(await this.requests.create(ctx.user.id, ctx.access, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateSisterClubRequestDto,
  ) {
    return sisterClubRequestDto(await this.requests.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.requests.remove(ctx.user.id, id);
  }
}
