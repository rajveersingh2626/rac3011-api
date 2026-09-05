import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheTags } from '../../cache/cache-tags.decorator';
import { Public } from '../../common/decorators/access.decorators';
import { paginate, parseListQuery } from '../../common/query/list-query';
import { RclFixturesService } from './rcl-fixtures.service';
import { RclStandingsService, type StandingsResponse } from './rcl-standings.service';
import { fixtureDto } from './rcl.transformer';
import type { FixtureStatusKind } from './rcl.types';

const FILTERS = ['season', 'status'] as const;

@ApiTags('public')
@Controller('public/rcl')
export class RclPublicController {
  constructor(
    private readonly standings: RclStandingsService,
    private readonly fixtures: RclFixturesService,
  ) {}

  @Get('standings')
  @Public()
  @CacheTags('rcl')
  async getStandings(@Query('season') season?: string): Promise<StandingsResponse> {
    return this.standings.build(season ? Number(season) : undefined);
  }

  @Get('fixtures')
  @Public()
  @CacheTags('rcl')
  async getFixtures(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS, maxPageSize: 200 });
    const { items, total } = await this.fixtures.list(
      {
        season: q.filter.season ? Number(q.filter.season) : undefined,
        status: q.filter.status as FixtureStatusKind | undefined,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(fixtureDto), total, q);
  }
}
