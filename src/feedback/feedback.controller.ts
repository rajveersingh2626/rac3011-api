import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackService } from './feedback.service';
import { feedbackDto } from './feedback.transformer';
import type { FeedbackStatus } from './feedback.types';

const FILTERS = ['status', 'eventId', 'clubId'] as const;

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post()
  @RequirePermission('feedback:submit')
  async submit(@CurrentUser() ctx: RequestContext, @Body() dto: CreateFeedbackDto) {
    return feedbackDto(await this.service.submit(ctx, dto));
  }

  @Get('mine')
  @Authenticated()
  async mine(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: [] });
    const { items, total } = await this.service.mine(ctx, q.page, q.pageSize);
    return paginate(items.map(feedbackDto), total, q);
  }

  @Get()
  @RequirePermission('feedback:review')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      ctx,
      {
        status: q.filter.status as FeedbackStatus | undefined,
        eventId: q.filter.eventId,
        clubId: q.filter.clubId,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(feedbackDto), total, q);
  }

  @Patch(':id')
  @RequirePermission('feedback:review')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return feedbackDto(await this.service.update(ctx, id, dto));
  }
}
