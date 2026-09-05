import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Authenticated, RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { PROJECT_KEYS } from '../public/project-summary.registry';
import { CheckinDto } from './dto/checkin.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { RsvpDto } from './dto/rsvp.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsAdminService } from './events-admin.service';
import { checkinDto, clubAttendanceDto, eventAdminDto } from './events-admin.transformer';

const FILTERS = ['clubId', 'isDistrictEvent', 'projectKey', 'from', 'to'] as const;
const INCLUDES = ['rsvp', 'attendance'] as const;

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid date "${value}"`);
  return d;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new BadRequestException('Expected "true" or "false"');
}

function parseProjectKey(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!(PROJECT_KEYS as string[]).includes(value))
    throw new BadRequestException(`Unknown projectKey "${value}"`);
  return value;
}

@ApiTags('events')
@Controller('events')
export class EventsAdminController {
  constructor(private readonly service: EventsAdminService) {}

  @Get()
  @RequirePermission('events:manage', 'club_events:log')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS, includes: INCLUDES });
    const { items, total } = await this.service.list(
      ctx,
      {
        clubId: q.filter.clubId,
        isDistrictEvent: parseBool(q.filter.isDistrictEvent),
        projectKey: parseProjectKey(q.filter.projectKey),
        from: parseDate(q.filter.from),
        to: parseDate(q.filter.to),
      },
      q.include,
      q.page,
      q.pageSize,
    );
    return paginate(
      items.map((row) => eventAdminDto(row, row)),
      total,
      q,
    );
  }

  @Post()
  @RequirePermission('events:manage', 'club_events:log')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateEventDto) {
    return eventAdminDto(await this.service.create(ctx, dto));
  }

  @Get(':id')
  @RequirePermission('events:manage', 'club_events:log')
  async get(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Query('include') include: string | undefined,
  ) {
    const includes = (include ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const row = await this.service.get(ctx, id, includes);
    return eventAdminDto(row, row);
  }

  @Patch(':id')
  @RequirePermission('events:manage', 'club_events:log')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return eventAdminDto(await this.service.update(ctx, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('events:manage', 'club_events:log')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.service.remove(ctx, id);
  }

  @Put(':id/rsvp')
  @Authenticated()
  async rsvp(@CurrentUser() ctx: RequestContext, @Param('id') id: string, @Body() dto: RsvpDto) {
    return this.service.rsvp(ctx, id, dto.status);
  }

  @Get(':id/checkins')
  @RequirePermission('events:checkin')
  async listCheckins(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    const { items, byClub } = await this.service.listCheckins(ctx, id);
    return {
      items: items.map((row) => checkinDto(row, false)),
      byClub: byClub.map(clubAttendanceDto),
    };
  }

  @Post(':id/checkins')
  @RequirePermission('events:checkin')
  async checkin(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: CheckinDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { row, alreadyCheckedIn } = await this.service.checkin(ctx, id, dto);
    res.status(alreadyCheckedIn ? HttpStatus.OK : HttpStatus.CREATED);
    return checkinDto(row, alreadyCheckedIn);
  }
}
