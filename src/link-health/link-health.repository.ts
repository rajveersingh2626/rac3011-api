import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LinkCheckStatus } from './link-checker.port';
import type { AdminAssetLinkRow, AssetLinkRow } from './link-health.types';

export type { AdminAssetLinkRow, AssetLinkRow } from './link-health.types';

const ADMIN_SELECT = {
  id: true,
  url: true,
  status: true,
  ownerUserId: true,
  kind: true,
  lastCheckedAt: true,
  lastError: true,
  resourceType: true,
  resourceId: true,
} as const;

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

  async upsertTracked(input: {
    url: string;
    kind: string;
    status: LinkCheckStatus;
    lastError: string | null;
    ownerUserId: string | null;
    resourceType: string;
    resourceId: string;
  }): Promise<void> {
    await this.prisma.assetLink.upsert({
      where: {
        resourceType_resourceId_url: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          url: input.url,
        },
      },
      create: {
        url: input.url,
        kind: input.kind,
        status: input.status,
        lastCheckedAt: new Date(),
        lastError: input.lastError,
        ownerUserId: input.ownerUserId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
      update: {
        kind: input.kind,
        status: input.status,
        lastCheckedAt: new Date(),
        lastError: input.lastError,
        ownerUserId: input.ownerUserId,
      },
    });
  }

  async findManyFiltered(status?: AssetLinkRow['status']): Promise<AdminAssetLinkRow[]> {
    return this.prisma.assetLink.findMany({
      where: status ? { status } : {},
      select: ADMIN_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findByIdAdmin(id: string): Promise<AdminAssetLinkRow | null> {
    return this.prisma.assetLink.findUnique({ where: { id }, select: ADMIN_SELECT });
  }
}
