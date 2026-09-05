import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { currentRyYear } from '../common/ry-year';
import { ClubPointsService } from './club-points.service';
import { JudgedPointsDto } from './dto/judged-points.dto';

@ApiTags('points')
@Controller('clubs/:clubId/points')
export class ClubPointsController {
  constructor(private readonly service: ClubPointsService) {}

  @Get()
  @RequirePermission('clubs:view', 'reports:review')
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
}
