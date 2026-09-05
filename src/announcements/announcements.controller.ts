import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { AnnouncementsService } from './announcements.service';
import { announcementDto } from './announcements.transformer';
import { AudienceEstimateDto } from './dto/audience-estimate.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get()
  @Authenticated()
  async feed(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: [] });
    const { items, total } = await this.service.feed(ctx, q.page, q.pageSize);
    return paginate(items.map(announcementDto), total, q);
  }

  @Post()
  @RequirePermission('announcements:send', 'announcements:send_all')
  async send(@CurrentUser() ctx: RequestContext, @Body() dto: CreateAnnouncementDto) {
    return announcementDto(await this.service.send(ctx, dto));
  }

  @Post('audience/estimate')
  @HttpCode(200)
  @RequirePermission('announcements:send', 'announcements:send_all')
  async estimate(@CurrentUser() ctx: RequestContext, @Body() dto: AudienceEstimateDto) {
    return { count: await this.service.estimate(ctx, dto.audience) };
  }
}
