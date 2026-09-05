import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../../common/query/list-query';
import type { RequestContext } from '../../common/types/access';
import { CreateCampDto } from './dto/create-camp.dto';
import { UpdateCampDto } from './dto/update-camp.dto';
import { Mission3011CampsService } from './mission3011-camps.service';
import { campDto } from './mission3011.transformer';
import type { CampStatusKind } from './mission3011.types';

const FILTERS = ['status', 'clubId'] as const;

@ApiTags('mission3011')
@Controller('mission3011/camps')
export class Mission3011CampsController {
  constructor(private readonly service: Mission3011CampsService) {}

  @Get()
  @Authenticated()
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      { status: q.filter.status as CampStatusKind | undefined, clubId: q.filter.clubId },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(campDto), total, q);
  }

  @Post()
  @RequirePermission('club_events:log')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateCampDto) {
    return campDto(await this.service.create(ctx, dto));
  }

  @Get(':id')
  @Authenticated()
  async get(@Param('id') id: string) {
    return campDto(await this.service.get(id));
  }

  @Patch(':id')
  @RequirePermission('club_events:log', 'subdomain:mission3011:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateCampDto,
  ) {
    return campDto(await this.service.update(ctx, id, dto));
  }
}
