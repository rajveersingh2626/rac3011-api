import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
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
import { ReportSchemasService } from './report-schemas.service';
import { ReportsExportService } from './reports-export.service';
import { ReportsService } from './reports.service';
import { reportDto } from './reports.transformer';
import type { ReportStatus } from './reports.types';

const FILTERS = ['clubId', 'ryYear', 'month', 'status'] as const;
const INCLUDES = ['queries', 'club', 'points'] as const;

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    private readonly schemas: ReportSchemasService,
    private readonly exports: ReportsExportService,
  ) {}

  @Get('export/zone-csv')
  @RequirePermission('reports:review')
  async exportZoneCsv(
    @CurrentUser() ctx: RequestContext,
    @Query('month') month: string | undefined,
    @Res() res: Response,
  ) {
    const { items } = await this.service.list(
      ctx.access,
      { month },
      { club: true },
      1,
      1000,
    );
    const csv = this.exports.generateRollupCsv(items, 'Zone Reports Summary');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="zone-reports-${month || 'all'}.csv"`);
    res.send(csv);
  }

  @Get('export/district-csv')
  @RequirePermission('reports:score')
  async exportDistrictCsv(
    @CurrentUser() ctx: RequestContext,
    @Query('month') month: string | undefined,
    @Res() res: Response,
  ) {
    const { items } = await this.service.list(
      ctx.access,
      { month },
      { club: true },
      1,
      1000,
    );
    const csv = this.exports.generateRollupCsv(items, 'District 3011 All Reports Summary');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="district-reports-${month || 'all'}.csv"`);
    res.send(csv);
  }

  @Get(':id/export/csv')
  @RequirePermission('reports:submit', 'reports:review')
  async exportCsv(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const report = await this.service.get(ctx.access, id, { club: true });
    const schema = await this.schemas.getActiveSchema();
    const csv = this.exports.generateReportCsv(report, schema);
    const club = report.club?.shortName || report.club?.name || 'club';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${club}-${report.id}.csv"`);
    res.send(csv);
  }

  @Get(':id/export/pdf')
  @RequirePermission('reports:submit', 'reports:review')
  async exportPdf(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const report = await this.service.get(ctx.access, id, { club: true });
    const schema = await this.schemas.getActiveSchema();
    const pdfBuffer = await this.exports.generateReportPdf(report, schema);
    const club = report.club?.shortName || report.club?.name || 'club';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${club}-${report.id}.pdf"`);
    res.send(pdfBuffer);
  }

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
