import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../../common/query/list-query';
import type { RequestContext } from '../../common/types/access';
import { CreateFixtureDto } from './dto/create-fixture.dto';
import { PutFixtureDto } from './dto/put-fixture.dto';
import { RclFixturesService } from './rcl-fixtures.service';
import { fixtureDto } from './rcl.transformer';
import type { FixtureStatusKind } from './rcl.types';

const FILTERS = ['season', 'status'] as const;

@ApiTags('rcl')
@Controller('rcl/fixtures')
export class RclFixturesController {
  constructor(private readonly service: RclFixturesService) {}

  @Get()
  @RequirePermission('club_events:log', 'subdomain:rcl:manage')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      {
        season: q.filter.season ? Number(q.filter.season) : undefined,
        status: q.filter.status as FixtureStatusKind | undefined,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(fixtureDto), total, q);
  }

  @Post()
  @RequirePermission('subdomain:rcl:manage')
  async create(@Body() dto: CreateFixtureDto) {
    return fixtureDto(await this.service.create(dto));
  }

  @Put(':id')
  @RequirePermission('subdomain:rcl:manage')
  async putResult(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: PutFixtureDto,
  ) {
    return fixtureDto(await this.service.putResult(ctx, id, dto));
  }
}
