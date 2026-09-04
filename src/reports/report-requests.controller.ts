import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import {
  CreateReportRequestDto,
  PutReportRequestResponseDto,
  UpdateReportRequestDto,
} from './dto/report-request.dto';
import { ReportRequestsService } from './report-requests.service';
import { reportRequestDto, reportRequestResponseDto } from './report-requests.transformer';

@ApiTags('report-requests')
@Controller('report-requests')
export class ReportRequestsController {
  constructor(private readonly service: ReportRequestsService) {}

  @Get()
  @RequirePermission('requests:manage', 'reports:submit')
  async list(@CurrentUser() ctx: RequestContext) {
    return { items: (await this.service.list(ctx.access)).map(reportRequestDto) };
  }

  @Post()
  @RequirePermission('requests:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateReportRequestDto) {
    return reportRequestDto(await this.service.create(ctx.access, dto));
  }

  @Get(':id')
  @RequirePermission('requests:manage', 'reports:submit')
  async get(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return reportRequestDto(await this.service.get(ctx.access, id));
  }

  @Patch(':id')
  @RequirePermission('requests:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateReportRequestDto,
  ) {
    return reportRequestDto(await this.service.update(ctx.access, id, dto));
  }

  @Delete(':id')
  @RequirePermission('requests:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    await this.service.delete(ctx.access, id);
    return { ok: true };
  }

  @Put(':id/responses/:clubId')
  @RequirePermission('reports:submit')
  async putResponse(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Param('clubId') clubId: string,
    @Body() dto: PutReportRequestResponseDto,
  ) {
    return reportRequestResponseDto(await this.service.putResponse(ctx.access, id, clubId, dto));
  }
}
