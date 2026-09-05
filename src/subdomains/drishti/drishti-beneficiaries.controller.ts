import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../../common/query/list-query';
import type { RequestContext } from '../../common/types/access';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { DrishtiBeneficiariesService } from './drishti-beneficiaries.service';
import { beneficiaryDto } from './drishti.transformer';
import type { DrishtiStageKind } from './drishti.types';

const FILTERS = ['stage', 'clubId'] as const;
const MANAGE_PERMISSION = 'subdomain:drishti:manage';

function canSeePii(ctx: RequestContext): boolean {
  return ctx.access.isSuperAdmin || (ctx.access.grants[MANAGE_PERMISSION] ?? []).length > 0;
}

@ApiTags('drishti')
@Controller('drishti/beneficiaries')
export class DrishtiBeneficiariesController {
  constructor(private readonly service: DrishtiBeneficiariesService) {}

  @Get()
  @RequirePermission('club_events:log', 'subdomain:drishti:manage')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      ctx,
      { stage: q.filter.stage as DrishtiStageKind | undefined, clubId: q.filter.clubId },
      q.page,
      q.pageSize,
    );
    const seePii = canSeePii(ctx);
    return paginate(
      items.map((row) => beneficiaryDto(row, seePii)),
      total,
      q,
    );
  }

  @Post()
  @RequirePermission('club_events:log', 'subdomain:drishti:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateBeneficiaryDto) {
    return beneficiaryDto(await this.service.create(ctx, dto), canSeePii(ctx));
  }

  @Get(':id')
  @RequirePermission('club_events:log', 'subdomain:drishti:manage')
  async get(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return beneficiaryDto(await this.service.get(ctx, id), canSeePii(ctx));
  }

  @Patch(':id')
  @RequirePermission('subdomain:drishti:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateBeneficiaryDto,
  ) {
    return beneficiaryDto(await this.service.update(ctx, id, dto), canSeePii(ctx));
  }
}
