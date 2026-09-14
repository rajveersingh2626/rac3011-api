import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { CreateReportSchemaDto, UpdateReportSchemaDto } from './dto/report-schema.dto';
import { ReportSchemasService } from './report-schemas.service';
import type { ReportSchemaWithFields } from './reports.types';
import { reportSchemaDto, reportSchemaSummaryDto } from './report-schemas.transformer';

const FILTERS = ['version'] as const;
const INCLUDES = ['fields'] as const;

@ApiTags('report-schemas')
@Controller('report-schemas')
export class ReportSchemasController {
  constructor(private readonly service: ReportSchemasService) {}

  @Get()
  @RequirePermission('reports:submit', 'requests:manage')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS, includes: INCLUDES });
    const withFields = q.include.includes('fields');
    const version = q.filter.version ? Number(q.filter.version) : undefined;
    const items = await this.service.list(ctx.access, version, withFields);
    return {
      items: withFields
        ? items.map((i) => reportSchemaDto(i as ReportSchemaWithFields))
        : items.map(reportSchemaSummaryDto),
    };
  }

  @Post()
  @RequirePermission('requests:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto?: CreateReportSchemaDto) {
    return reportSchemaDto(await this.service.create(ctx.access, dto?.baseVersion));
  }

  @Patch(':version')
  @RequirePermission('requests:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: UpdateReportSchemaDto,
  ) {
    return reportSchemaDto(await this.service.update(ctx.access, version, dto));
  }

  @Delete(':version')
  @HttpCode(204)
  @RequirePermission('requests:manage')
  async remove(
    @CurrentUser() ctx: RequestContext,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<void> {
    await this.service.remove(ctx.access, version);
  }
}
