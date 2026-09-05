import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../../common/query/list-query';
import type { RequestContext } from '../../common/types/access';
import { UpsertSupportClubDto } from './dto/upsert-support-club.dto';
import { RideSupportClubsService } from './ride-support-clubs.service';
import { supportClubDto } from './ride.transformer';

const FILTERS = ['ryYear', 'clubId'] as const;

@ApiTags('ride')
@Controller('ride/support-clubs')
export class RideSupportClubsController {
  constructor(private readonly service: RideSupportClubsService) {}

  @Get()
  @RequirePermission('club_events:log', 'subdomain:ride:manage')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const ryYear = q.filter.ryYear ? Number(q.filter.ryYear) : undefined;
    const { items, total } = await this.service.list(
      ctx,
      { ryYear, clubId: q.filter.clubId },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(supportClubDto), total, q);
  }

  @Post()
  @RequirePermission('club_events:log', 'subdomain:ride:manage')
  async upsert(@CurrentUser() ctx: RequestContext, @Body() dto: UpsertSupportClubDto) {
    return supportClubDto(await this.service.upsert(ctx, dto));
  }
}
