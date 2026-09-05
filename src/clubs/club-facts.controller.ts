import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { currentRyYear } from '../common/ry-year';
import { ClubFactsService } from './club-facts.service';
import { clubFactsDto } from './clubs.transformer';
import { UpdateClubFactsDto } from './dto/update-club-facts.dto';

@ApiTags('clubs')
@Controller('clubs/:clubId/facts')
export class ClubFactsController {
  constructor(private readonly service: ClubFactsService) {}

  @Get()
  @RequirePermission('clubs:view', 'reports:review')
  async get(
    @CurrentUser() ctx: RequestContext,
    @Param('clubId') clubId: string,
    @Query('ryYear') ryYear: string | undefined,
  ) {
    const year = ryYear ? Number(ryYear) : currentRyYear();
    const facts = await this.service.get(ctx.access, clubId, year);
    return facts ? clubFactsDto(facts) : null;
  }

  @Patch()
  @RequirePermission('club_facts:edit')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('clubId') clubId: string,
    @Body() dto: UpdateClubFactsDto,
  ) {
    return clubFactsDto(await this.service.update(ctx.access, clubId, dto));
  }
}
