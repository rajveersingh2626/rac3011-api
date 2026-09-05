import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../../common/query/list-query';
import type { RequestContext } from '../../common/types/access';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { RclTeamsService } from './rcl-teams.service';
import { teamDto } from './rcl.transformer';
import type { TeamStatusKind } from './rcl.types';

const FILTERS = ['season', 'clubId', 'status'] as const;

@ApiTags('rcl')
@Controller('rcl/teams')
export class RclTeamsController {
  constructor(private readonly service: RclTeamsService) {}

  @Get()
  @RequirePermission('club_events:log', 'subdomain:rcl:manage')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      ctx,
      {
        season: q.filter.season ? Number(q.filter.season) : undefined,
        clubId: q.filter.clubId,
        status: q.filter.status as TeamStatusKind | undefined,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(teamDto), total, q);
  }

  @Post()
  @RequirePermission('club_events:log', 'subdomain:rcl:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateTeamDto) {
    return teamDto(await this.service.create(ctx, dto));
  }

  @Get(':id')
  @RequirePermission('club_events:log', 'subdomain:rcl:manage')
  async get(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return teamDto(await this.service.get(ctx, id));
  }

  @Patch(':id')
  @RequirePermission('club_events:log', 'subdomain:rcl:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return teamDto(await this.service.update(ctx, id, dto));
  }
}
