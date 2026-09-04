import { Body, Controller, Get, Param, Patch, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { ClubsService } from './clubs.service';
import { clubDto, zoneDto } from './clubs.transformer';
import { PutBoardDto } from './dto/put-board.dto';
import { UpdateClubDto } from './dto/update-club.dto';

const FILTERS = ['zoneId', 'q'] as const;
const INCLUDES = ['board', 'facts', 'summary'] as const;

@ApiTags('clubs')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubs: ClubsService) {}

  @Get()
  @RequirePermission('clubs:view')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS, includes: INCLUDES });
    const { items, total } = await this.clubs.list(
      ctx.access,
      { zoneId: q.filter.zoneId, q: q.q },
      { board: q.include.includes('board'), facts: q.include.includes('facts') },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(clubDto), total, q);
  }

  @Get(':id')
  @RequirePermission('clubs:view')
  async get(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Query() raw: Record<string, unknown>,
  ) {
    const q = parseListQuery(raw, { filters: [], includes: INCLUDES });
    const club = await this.clubs.get(ctx.access, id, {
      board: q.include.includes('board'),
      facts: q.include.includes('facts'),
    });
    return clubDto(club);
  }

  @Patch(':id')
  @RequirePermission('clubs:edit')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateClubDto,
  ) {
    return clubDto(await this.clubs.update(ctx.access, id, dto));
  }

  @Put(':id/board')
  @RequirePermission('clubs:edit')
  async putBoard(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: PutBoardDto,
  ) {
    return clubDto(await this.clubs.putBoard(ctx.access, id, dto));
  }
}

@ApiTags('zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly clubs: ClubsService) {}

  @Get()
  @Authenticated()
  async list() {
    return (await this.clubs.listZones()).map(zoneDto);
  }
}
