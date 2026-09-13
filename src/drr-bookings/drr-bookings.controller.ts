import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { DecideDrrBookingDto } from './dto/decide-drr-booking.dto';
import { CreateDrrBlockDto } from './dto/create-drr-block.dto';
import { DrrBookingsService } from './drr-bookings.service';
import { drrBookingAdminDto } from './drr-bookings.transformer';
import type { BookingStatus } from './drr-bookings.types';

const FILTERS = ['status', 'clubId', 'from', 'to'] as const;

function parseDateFilter(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@ApiTags('drr-bookings')
@Controller('drr-bookings')
export class DrrBookingsController {
  constructor(private readonly service: DrrBookingsService) {}

  @Get()
  @RequirePermission('drr_calendar:manage')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      ctx,
      {
        status: q.filter.status as BookingStatus | undefined,
        clubId: q.filter.clubId,
        from: parseDateFilter(q.filter.from),
        to: parseDateFilter(q.filter.to),
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(drrBookingAdminDto), total, q);
  }

  @Get(':id')
  @RequirePermission('drr_calendar:manage')
  async get(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return drrBookingAdminDto(await this.service.get(ctx, id));
  }

  @Patch(':id')
  @RequirePermission('drr_calendar:manage')
  async decide(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: DecideDrrBookingDto,
  ) {
    return drrBookingAdminDto(await this.service.decide(ctx, id, dto));
  }

  @Get('blocks/all')
  @RequirePermission('drr_calendar:manage')
  async listBlocks(@Query('from') fromStr?: string, @Query('to') toStr?: string) {
    const from = parseDateFilter(fromStr);
    const to = parseDateFilter(toStr);
    const items = await this.service.listBlocks(from, to);
    return { items };
  }

  @Post('blocks')
  @RequirePermission('drr_calendar:manage')
  async createBlock(
    @CurrentUser() ctx: RequestContext,
    @Body() dto: CreateDrrBlockDto,
  ) {
    return this.service.createBlock(ctx.user.id, dto);
  }

  @Delete('blocks/:id')
  @RequirePermission('drr_calendar:manage')
  async deleteBlock(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
  ) {
    await this.service.deleteBlock(ctx.user.id, id);
    return { success: true };
  }
}
