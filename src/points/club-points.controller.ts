import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { currentRyYear } from '../common/ry-year';
import { ClubPointsService } from './club-points.service';
import { JudgedPointsDto } from './dto/judged-points.dto';
import { CreatePointEntryDto, UpdatePointEntryDto } from './dto/point-entry.dto';

@ApiTags('points')
@Controller('clubs/:clubId/points')
export class ClubPointsController {
  constructor(private readonly service: ClubPointsService) {}

  @Get()
  @RequirePermission(
    'clubs:view',
    'reports:review',
    'reports:submit',
    'reports:score',
    'reports:manage',
  )
  async get(
    @CurrentUser() ctx: RequestContext,
    @Param('clubId') clubId: string,
    @Query('ryYear') ryYear: string | undefined,
    @Query('month') month: string | undefined,
  ) {
    const year = ryYear ? Number(ryYear) : currentRyYear();
    return this.service.getPoints(ctx.access, clubId, year, month);
  }

  @Patch()
  @RequirePermission('reports:score')
  async patchJudged(
    @CurrentUser() ctx: RequestContext,
    @Param('clubId') clubId: string,
    @Query('month') month: string,
    @Body() dto: JudgedPointsDto,
  ) {
    return this.service.patchJudged(ctx.access, clubId, month, dto);
  }

  @Patch('entries/:entryId')
  @RequirePermission('reports:score')
  async updateEntry(
    @CurrentUser() ctx: RequestContext,
    @Param('clubId') clubId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdatePointEntryDto,
  ) {
    return this.service.updatePointEntry(ctx.access, clubId, entryId, dto);
  }

  @Post('entries')
  @RequirePermission('reports:score')
  async createCustomEntry(
    @CurrentUser() ctx: RequestContext,
    @Param('clubId') clubId: string,
    @Body() dto: CreatePointEntryDto,
  ) {
    return this.service.createCustomEntry(ctx.access, clubId, dto);
  }

  @Delete('entries/:entryId')
  @RequirePermission('reports:score')
  async deleteEntry(
    @CurrentUser() ctx: RequestContext,
    @Param('clubId') clubId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.service.deletePointEntry(ctx.access, clubId, entryId);
  }
}
