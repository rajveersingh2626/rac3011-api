import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ScopeService } from '../common/scope/scope.service';
import { CodedConflictException } from '../common/errors/conflict.error';
import type { RequestContext } from '../common/types/access';
import { MeService } from '../me/me.service';
import { NotificationPort } from '../notifications/notification.port';
import { SettingsService } from '../settings/settings.service';
import type { CreateFeedbackInput } from './dto/create-feedback.dto';
import type { UpdateFeedbackInput } from './dto/update-feedback.dto';
import { FeedbackRepository } from './feedback.repository';
import type { FeedbackListFilter, FeedbackRow } from './feedback.types';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly repo: FeedbackRepository,
    private readonly scope: ScopeService,
    private readonly me: MeService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationPort,
  ) {}

  async submit(ctx: RequestContext, input: CreateFeedbackInput): Promise<FeedbackRow> {
    if (input.category === 'event' && input.eventId) {
      const exists = await this.repo.eventExists(input.eventId);
      if (!exists) throw new BadRequestException('Unknown event');
    }

    const anonymous = input.anonymous ?? false;
    if (anonymous) {
      const allowed = (await this.settings.listAll())['feedback.allowAnonymous'];
      if (allowed !== true) throw new BadRequestException('Anonymous feedback is not enabled');
    }

    const profile = anonymous ? null : await this.me.getProfile(ctx);
    return this.repo.create({
      submittedById: anonymous ? null : ctx.user.id,
      clubId: profile?.clubId ?? null,
      category: input.category,
      message: input.message,
      eventId: input.category === 'event' ? (input.eventId ?? null) : null,
    });
  }

  mine(
    ctx: RequestContext,
    page: number,
    pageSize: number,
  ): Promise<{ items: FeedbackRow[]; total: number }> {
    return this.repo.findMine(ctx.user.id, page, pageSize);
  }

  async list(
    ctx: RequestContext,
    filter: FeedbackListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: FeedbackRow[]; total: number }> {
    const scope = await this.scope.clubFilter(ctx.access, 'feedback:review');
    const narrowed = ScopeService.narrowClubs(scope, filter.clubId);
    if ('clubIds' in narrowed && narrowed.clubIds.length === 0) return { items: [], total: 0 };
    return this.repo.findMany(filter, narrowed, page, pageSize);
  }

  async update(ctx: RequestContext, id: string, input: UpdateFeedbackInput): Promise<FeedbackRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    if (existing.status === 'closed' && (input.status === undefined || input.status === 'closed')) {
      if (input.reply !== undefined) {
        throw new CodedConflictException('INVALID_TRANSITION', 'This feedback is already closed');
      }
    }

    const status =
      input.status ??
      (input.reply !== undefined && existing.status === 'open' ? 'reviewed' : undefined);
    const updated = await this.repo.update(id, {
      status,
      reply: input.reply,
      reviewedById: ctx.user.id,
      reviewedAt: new Date(),
    });

    if (input.reply !== undefined && existing.submittedById) {
      const email = await this.repo.findUserEmail(existing.submittedById);
      await this.notifications.notify({
        template: 'feedback-replied',
        to: [{ userId: existing.submittedById, email: email ?? undefined }],
        data: { feedbackId: id, reply: input.reply },
      });
    }

    return updated;
  }
}
