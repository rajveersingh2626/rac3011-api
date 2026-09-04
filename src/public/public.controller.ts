import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AchievementsService } from '../achievements/achievements.service';
import { achievementDto } from '../achievements/achievements.transformer';
import { AnalyticsService } from '../analytics/analytics.service';
import { CacheTags } from '../cache/cache-tags.decorator';
import { Public } from '../common/decorators/access.decorators';
import { parseListQuery } from '../common/query/list-query';
import { ContentService } from '../content/content.service';
import { CreateEnquiryDto } from '../enquiries/dto/create-enquiry.dto';
import { EnquiriesService } from '../enquiries/enquiries.service';
import { eventToIcs, eventsToIcs } from '../events/ics.util';
import { publicEventDto } from '../events/events.transformer';
import { EventsService } from '../events/events.service';
import { HeritageService } from '../heritage/heritage.service';
import { pastDrrDto } from '../heritage/heritage.transformer';
import { LeadershipService } from '../leadership/leadership.service';
import { districtTeamMemberDto } from '../leadership/leadership.transformer';
import { PartnersService } from '../partners/partners.service';
import { partnerDto } from '../partners/partners.transformer';
import { PublicationsService } from '../publications/publications.service';
import { publicationDto } from '../publications/publications.transformer';
import { ResourcesService } from '../resources/resources.service';
import { publicResourceDto } from '../resources/resources.transformer';
import { publicProjectDetailDto, publicProjectSummaryDto } from '../showcase/showcase.transformer';
import { ShowcaseService } from '../showcase/showcase.service';
import { setLiveCache, setNoCache, setPublicCache } from './cache.util';
import {
  publicBoardMemberDto,
  publicClubDetailDto,
  publicClubSummaryDto,
} from './public-clubs.transformer';
import { PublicClubsService } from './public-clubs.service';
import { PublicHomeService } from './public-home.service';
import { PublicInitiativesService } from './public-initiatives.service';
import { PROJECT_KEYS, type ProjectKey } from './project-summary.registry';

function parseDateParam(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly home: PublicHomeService,
    private readonly analytics: AnalyticsService,
    private readonly clubs: PublicClubsService,
    private readonly showcase: ShowcaseService,
    private readonly heritage: HeritageService,
    private readonly leadership: LeadershipService,
    private readonly achievements: AchievementsService,
    private readonly partners: PartnersService,
    private readonly publications: PublicationsService,
    private readonly resources: ResourcesService,
    private readonly content: ContentService,
    private readonly initiatives: PublicInitiativesService,
    private readonly events: EventsService,
    private readonly enquiries: EnquiriesService,
  ) {}

  @Get('home')
  @Public()
  @CacheTags('content', 'settings', 'projects')
  async getHome() {
    return this.home.build();
  }

  @Get('live')
  @Public()
  async getLive(@Res({ passthrough: true }) res: Response) {
    setLiveCache(res);
    return this.analytics.currentVisits();
  }

  @Post('visits')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async postVisits(@Res({ passthrough: true }) res: Response) {
    setNoCache(res);
    return this.analytics.recordVisit();
  }

  @Get('clubs')
  @Public()
  @CacheTags('clubs')
  async listClubs(@Query('zoneId') zoneId: string | undefined) {
    const items = await this.clubs.list(zoneId);
    return { items: items.map(publicClubSummaryDto), total: items.length };
  }

  @Get('clubs/:slug')
  @Public()
  @CacheTags('clubs', 'projects')
  async getClub(@Param('slug') slug: string, @Query('include') include: string | undefined) {
    const includes = (include ?? '').split(',').map((s) => s.trim());
    const { club, board, projects } = await this.clubs.bySlug(slug, {
      board: includes.includes('board'),
      projects: includes.includes('projects'),
    });
    return {
      ...publicClubDetailDto(club),
      ...(board ? { board: board.map(publicBoardMemberDto) } : {}),
      ...(projects ? { projects: projects.map(publicProjectSummaryDto) } : {}),
    };
  }

  @Get('projects')
  @Public()
  @CacheTags('projects')
  async listProjects(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: ['category', 'clubSlug'] as const });
    const { items, total } = await this.showcase.list(
      { category: q.filter.category, clubSlug: q.filter.clubSlug },
      q.page,
      q.pageSize,
    );
    return { items: items.map(publicProjectSummaryDto), total, page: q.page, pageSize: q.pageSize };
  }

  @Get('projects/:slug')
  @Public()
  @CacheTags('projects')
  async getProject(@Param('slug') slug: string) {
    return publicProjectDetailDto(await this.showcase.bySlug(slug));
  }

  @Get('past-drrs')
  @Public()
  @CacheTags('heritage')
  async listPastDrrs() {
    return { items: (await this.heritage.list()).map(pastDrrDto) };
  }

  @Get('past-drrs/:slug')
  @Public()
  @CacheTags('heritage')
  async getPastDrr(@Param('slug') slug: string) {
    return pastDrrDto(await this.heritage.bySlug(slug));
  }

  @Get('district-team')
  @Public()
  @CacheTags('district-team')
  async getDistrictTeam() {
    return { items: (await this.leadership.currentTeam()).map(districtTeamMemberDto) };
  }

  @Get('achievements')
  @Public()
  @CacheTags('achievements')
  async listAchievements() {
    return { items: (await this.achievements.list()).map(achievementDto) };
  }

  @Get('partners')
  @Public()
  @CacheTags('partners')
  async listPartners() {
    return { items: (await this.partners.list()).map(partnerDto) };
  }

  @Get('publications')
  @Public()
  @CacheTags('publications')
  async listPublications() {
    return { items: (await this.publications.list()).map(publicationDto) };
  }

  @Get('resources')
  @Public()
  @CacheTags('resources')
  async listResources() {
    return { items: (await this.resources.list()).map(publicResourceDto) };
  }

  @Get('content/:pageKey')
  @Public()
  @CacheTags('content')
  async getContent(@Param('pageKey') pageKey: string) {
    return this.content.publishedBlocks(pageKey);
  }

  @Get('initiatives')
  @Public()
  @CacheTags('settings', 'initiatives')
  async listInitiatives() {
    return { items: await this.initiatives.list() };
  }

  @Get('projects-summary/:key')
  @Public()
  @CacheTags('settings', 'initiatives')
  async getInitiativeSummary(@Param('key') key: string) {
    if (!PROJECT_KEYS.includes(key as ProjectKey)) throw new NotFoundException();
    return this.initiatives.card(key as ProjectKey);
  }

  @Get('events')
  @Public()
  @CacheTags('events')
  async listEvents(@Query('from') from: string | undefined, @Query('to') to: string | undefined) {
    const items = await this.events.listInRange(parseDateParam(from), parseDateParam(to));
    return { items: items.map(publicEventDto) };
  }

  @Get('events/:slug')
  @Public()
  @CacheTags('events')
  async getEvent(@Param('slug') slug: string) {
    return publicEventDto(await this.events.bySlug(slug));
  }

  @Get('events/:slug.ics')
  @Public()
  @Header('Content-Type', 'text/calendar')
  async getEventIcs(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    setPublicCache(res, 300);
    return eventToIcs(await this.events.bySlug(slug));
  }

  @Get('calendar.ics')
  @Public()
  @Header('Content-Type', 'text/calendar')
  async getCalendarIcs(@Res({ passthrough: true }) res: Response) {
    setPublicCache(res, 300);
    return eventsToIcs(await this.events.listAllUpcoming());
  }

  @Post('enquiries')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async postEnquiry(@Body() dto: CreateEnquiryDto, @Res({ passthrough: true }) res: Response) {
    setNoCache(res);
    const result = await this.enquiries.submit(dto);
    if ('honeypot' in result) return { received: true };
    return { received: true, routedTo: result.routedToName || null };
  }
}
