import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import {
  CreateReportDto,
  CreateReportQueryDto,
  ReplyReportQueryDto,
  UpdateReportDto,
} from './dto/report.dto';
import { ReportsService } from './reports.service';
import { reportDto } from './reports.transformer';
import type { ReportStatus } from './reports.types';

const FILTERS = ['clubId', 'ryYear', 'month', 'status'] as const;
const INCLUDES = ['queries', 'club', 'points'] as const;

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  @RequirePermission('reports:submit', 'reports:review')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS, includes: INCLUDES });
    const { items, total } = await this.service.list(
      ctx.access,
      {
        clubId: q.filter.clubId,
        ryYear: q.filter.ryYear ? Number(q.filter.ryYear) : undefined,
        month: q.filter.month,
        status: q.filter.status as ReportStatus | undefined,
      },
      { queries: q.include.includes('queries'), club: q.include.includes('club') },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(reportDto), total, q);
  }

  @Post()
  @RequirePermission('reports:submit')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateReportDto) {
    return reportDto(await this.service.create(ctx.access, dto));
  }

  @Get(':id')
  @RequirePermission('reports:submit', 'reports:review')
  async get(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Query() raw: Record<string, unknown>,
  ) {
    const q = parseListQuery(raw, { filters: [], includes: INCLUDES });
    return reportDto(
      await this.service.get(ctx.access, id, {
        queries: q.include.includes('queries'),
        club: q.include.includes('club'),
      }),
    );
  }

  @Patch(':id')
  @RequirePermission('reports:submit')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return reportDto(await this.service.update(ctx.access, id, dto));
  }

  @Get(':id/assist')
  @RequirePermission('reports:score')
  async assist(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return this.service.assist(ctx.access, id);
  }

  @Post(':id/queries')
  @RequirePermission('reports:review')
  async addQuery(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: CreateReportQueryDto,
  ) {
    return reportDto(await this.service.addQuery(ctx.access, id, dto.question));
  }

  @Patch(':id/queries/:queryId')
  @RequirePermission('reports:submit')
  async replyQuery(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Param('queryId') queryId: string,
    @Body() dto: ReplyReportQueryDto,
  ) {
    return reportDto(await this.service.replyQuery(ctx.access, id, queryId, dto.reply));
  }
}
