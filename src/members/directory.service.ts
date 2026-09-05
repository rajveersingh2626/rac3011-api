import { Injectable, NotFoundException } from '@nestjs/common';
import { CodedConflictException } from '../common/errors/conflict.error';
import type { ResolvedAccess } from '../common/types/access';
import { DirectoryRepository } from './directory.repository';
import type { DirectoryEntryRow, DirectoryFilter } from './members.types';

@Injectable()
export class DirectoryService {
  constructor(private readonly repo: DirectoryRepository) {}

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
