import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LinkCheckStatus } from './link-checker.port';

export type AssetLinkRow = {
  id: string;
  url: string;
  status: 'unchecked' | 'ok' | 'broken' | 'private';
  ownerUserId: string | null;
};

@Injectable()
export class LinkHealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<AssetLinkRow[]> {
    return this.prisma.assetLink.findMany({
      select: { id: true, url: true, status: true, ownerUserId: true },
    });
  }

  findById(id: string): Promise<AssetLinkRow | null> {
    return this.prisma.assetLink.findUnique({
      where: { id },
      select: { id: true, url: true, status: true, ownerUserId: true },
    });
  }

  async updateStatus(id: string, status: LinkCheckStatus, lastError: string | null): Promise<void> {
    await this.prisma.assetLink.update({
      where: { id },
      data: { status, lastCheckedAt: new Date(), lastError },
    });
  }
}
