import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../../common/query/list-query';
import type { RequestContext } from '../../common/types/access';
import { AssignHostsDto } from './dto/assign-hosts.dto';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { UpdateDelegationDto } from './dto/update-delegation.dto';
import { RideDelegationsService } from './ride-delegations.service';
import { delegationDto } from './ride.transformer';
import type { DelegationStatusKind } from './ride.types';

const FILTERS = ['status', 'ryYear'] as const;

@ApiTags('ride')
@Controller('ride/delegations')
export class RideDelegationsController {
  constructor(private readonly service: RideDelegationsService) {}

  @Get()
  @RequirePermission('subdomain:ride:manage')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const ryYear = q.filter.ryYear ? Number(q.filter.ryYear) : undefined;
    const { items, total } = await this.service.list(
      { status: q.filter.status as DelegationStatusKind | undefined, ryYear },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(delegationDto), total, q);
  }

  @Post()
  @RequirePermission('subdomain:ride:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateDelegationDto) {
    return delegationDto(await this.service.create(ctx, dto));
  }

  @Get(':id')
  @RequirePermission('subdomain:ride:manage')
  async get(@Param('id') id: string) {
    return delegationDto(await this.service.get(id));
  }

  @Patch(':id')
  @RequirePermission('subdomain:ride:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateDelegationDto,
  ) {
    return delegationDto(await this.service.update(ctx, id, dto));
  }

  @Put(':id/hosts')
  @RequirePermission('subdomain:ride:manage')
  async assignHosts(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: AssignHostsDto,
  ) {
    return delegationDto(await this.service.assignHosts(ctx, id, dto));
  }
}
