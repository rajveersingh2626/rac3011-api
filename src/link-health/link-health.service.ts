import { Injectable, Logger } from '@nestjs/common';
import { NotificationPort } from '../notifications/notification.port';
import { LinkCheckerPort } from './link-checker.port';
import { LinkHealthRepository } from './link-health.repository';

@Injectable()
export class LinkHealthService {
  private readonly logger = new Logger('LinkHealthService');

  constructor(
    private readonly repo: LinkHealthRepository,
    private readonly checker: LinkCheckerPort,
    private readonly notifications: NotificationPort,
  ) {}

  async recheckOne(id: string): Promise<void> {
    const link = await this.repo.findById(id);
    if (!link) return;
    await this.applyCheck(link.id, link.url, link.status, link.ownerUserId);
  }

  async recheckAll(): Promise<{ checked: number; transitioned: number }> {
    const links = await this.repo.findAll();
    let transitioned = 0;
    for (const link of links) {
      const changed = await this.applyCheck(link.id, link.url, link.status, link.ownerUserId);
      if (changed) transitioned++;
    }
    return { checked: links.length, transitioned };
  }

  private async applyCheck(
    id: string,
    url: string,
    previousStatus: 'unchecked' | 'ok' | 'broken' | 'private',
    ownerUserId: string | null,
  ): Promise<boolean> {
    const nextStatus = await this.checker.check(url);
    await this.repo.updateStatus(
      id,
      nextStatus,
      nextStatus === 'ok' ? null : `status=${nextStatus}`,
    );
    const wasHealthy = previousStatus === 'ok' || previousStatus === 'unchecked';
    const nowUnhealthy = nextStatus === 'broken' || nextStatus === 'private';
    if (wasHealthy && nowUnhealthy && ownerUserId) {
      await this.notifications.notify({
        template: 'link-broken',
        to: [{ userId: ownerUserId }],
        data: { url, status: nextStatus },
      });
    }
    if (nextStatus !== previousStatus)
      this.logger.log(`asset_link ${id} ${previousStatus} -> ${nextStatus}`);
    return nextStatus !== previousStatus;
  }
}
