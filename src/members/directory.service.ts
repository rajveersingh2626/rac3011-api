import { Injectable, NotFoundException } from '@nestjs/common';
import { CodedConflictException } from '../common/errors/conflict.error';
import type { ResolvedAccess } from '../common/types/access';
import { NotificationPort } from '../notifications/notification.port';
import { DirectoryRepository } from './directory.repository';
import type { DirectoryEntryRow, DirectoryFilter } from './members.types';

@Injectable()
export class DirectoryService {
  constructor(
    private readonly repo: DirectoryRepository,
    private readonly notifications: NotificationPort,
  ) {}

  async search(
    access: ResolvedAccess,
    filter: DirectoryFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: DirectoryEntryRow[]; total: number }> {
    await this.assertPrivacyAccepted(access.userId);
    return this.repo.findMany(filter, page, pageSize);
  }

  async acceptPrivacyPolicy(userId: string): Promise<void> {
    const memberId = await this.repo.memberIdForUser(userId);
    if (!memberId) throw new NotFoundException('No member profile for this account');
    const publishedAt = await this.repo.currentPrivacyPolicyPublishedAt();
    if (!publishedAt) {
      throw new CodedConflictException(
        'PRIVACY_NOT_ACCEPTED',
        'No privacy policy is currently published',
      );
    }
    await this.repo.recordAcceptance(memberId, publishedAt);
  }

  async requestContact(
    currentUser: { id: string; name: string; email: string },
    targetMemberId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    const targetMember = await this.repo.findMemberById(targetMemberId);
    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    if (targetMember.user?.email || targetMember.userId) {
      await this.notifications.notify({
        template: 'announcement',
        to: [
          {
            userId: targetMember.userId ?? undefined,
            email: targetMember.user?.email,
          },
        ],
        data: {
          title: `Contact details requested by ${currentUser.name}`,
          body: `Hi ${targetMember.fullName},\n\n${currentUser.name} (${currentUser.email}) has requested your contact number via the Rotaract 3011 Directory.\n\n${reason ? `Message / Reason: "${reason}"\n\n` : ''}You may reach out to them directly at ${currentUser.email}.`,
          senderName: 'Rotaract 3011 Portal',
        },
        channels: ['email'],
      });
    }

    return {
      success: true,
      message: `Contact request sent to ${targetMember.fullName}. They have been notified by email.`,
    };
  }

  private async assertPrivacyAccepted(userId: string): Promise<void> {
    const memberId = await this.repo.memberIdForUser(userId);
    const publishedAt = await this.repo.currentPrivacyPolicyPublishedAt();
    const accepted =
      memberId && publishedAt ? await this.repo.hasAccepted(memberId, publishedAt) : false;
    if (!accepted) {
      throw new CodedConflictException(
        'PRIVACY_NOT_ACCEPTED',
        'Accept the privacy policy before browsing the member directory',
      );
    }
  }
}
