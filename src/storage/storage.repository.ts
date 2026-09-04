import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { StorageTier } from './storage.port';

export type UploadGrantRow = {
  id: string;
  tier: StorageTier;
  provider: string;
  mimeType: string;
  size: number;
  name: string;
  resourceType: string;
  resourceId: string | null;
  clubId: string | null;
  userId: string;
  uploadUrl: string;
  status: 'pending' | 'finalised' | 'expired';
  expiresAt: Date;
  fileId: string | null;
};

export type CreateGrantInput = {
  id: string;
  tier: StorageTier;
  provider: string;
  mimeType: string;
  size: number;
  name: string;
  resourceType: string;
  resourceId?: string;
  clubId?: string;
  userId: string;
  uploadUrl: string;
  expiresAt: Date;
};

export type StoredFileRecord = {
  id: string;
  tier: StorageTier;
  provider: string;
  providerKey: string;
  url: string | null;
  name: string;
  mimeType: string;
  size: number;
  resourceType: string;
  resourceId: string | null;
  clubId: string | null;
  uploadedById: string;
};

export type CreateFileInput = Omit<StoredFileRecord, never>;

@Injectable()
export class StorageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createGrant(input: CreateGrantInput): Promise<void> {
    await this.prisma.uploadGrant.create({
      data: {
        id: input.id,
        tier: input.tier,
        provider: input.provider,
        mimeType: input.mimeType,
        size: input.size,
        name: input.name,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        clubId: input.clubId,
        userId: input.userId,
        uploadUrl: input.uploadUrl,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findGrant(id: string): Promise<UploadGrantRow | null> {
    return this.prisma.uploadGrant.findUnique({ where: { id } });
  }

  async markGrantFinalised(id: string, fileId: string): Promise<void> {
    await this.prisma.uploadGrant.update({ where: { id }, data: { status: 'finalised', fileId } });
  }

  async createFile(input: CreateFileInput): Promise<StoredFileRecord> {
    return this.prisma.storedFileRow.create({ data: input });
  }

  async findFile(id: string): Promise<StoredFileRecord | null> {
    return this.prisma.storedFileRow.findUnique({ where: { id } });
  }

  async deleteFile(id: string): Promise<void> {
    await this.prisma.storedFileRow.delete({ where: { id } });
  }
}
