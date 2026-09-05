import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationPort } from '../notifications/notification.port';
import { LinkCheckerPort, type LinkCheckStatus } from './link-checker.port';
import { LinkHealthRepository, type AssetLinkRow } from './link-health.repository';

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

  listAdmin(status?: AssetLinkRow['status']) {
    return this.repo.findManyFiltered(status);
  }

  async recheckAndReturn(id: string) {
    const before = await this.repo.findByIdAdmin(id);
    if (!before) throw new NotFoundException();
    await this.applyCheck(before.id, before.url, before.status, before.ownerUserId);
    return this.repo.findByIdAdmin(id);
  }

  async checkAndTrack(input: {
    url: string;
    kind: string;
    ownerUserId: string | null;
    resourceType: string;
    resourceId: string;
  }): Promise<LinkCheckStatus> {
    const status = await this.checker.check(input.url);
    await this.repo.upsertTracked({
      ...input,
      status,
      lastError: status === 'ok' ? null : `status=${status}`,
    });
    return status;
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
