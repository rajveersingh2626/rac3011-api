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

  async findProfileIdForUser(userId: string): Promise<string | null> {
    const row = await this.prisma.memberProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

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

  async findFileByUrlOrKey(urlOrKey: string): Promise<StoredFileRecord | null> {
    return this.prisma.storedFileRow.findFirst({
      where: {
        OR: [
          { url: urlOrKey },
          { providerKey: urlOrKey },
          { id: urlOrKey },
        ],
      },
    });
  }

  async deleteFile(id: string): Promise<void> {
    await this.prisma.storedFileRow.delete({ where: { id } });
    await this.prisma.uploadGrant.deleteMany({ where: { fileId: id } });
  }

  async findStoredFilesOlderThan(cutoff: Date): Promise<StoredFileRecord[]> {
    return this.prisma.storedFileRow.findMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });
  }

  async cleanExpiredGrants(cutoff: Date): Promise<number> {
    const res = await this.prisma.uploadGrant.deleteMany({
      where: {
        OR: [
          { status: 'expired' },
          { status: 'pending', expiresAt: { lt: cutoff } },
        ],
      },
    });
    return res.count;
  }

  async getAllReferencedUrls(): Promise<Set<string>> {
    const refs = new Set<string>();

    const add = (val: unknown) => {
      if (!val) return;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed) {
          refs.add(trimmed);
          // Also add extracted key if it's an uploadthing url
          if (trimmed.includes('/f/')) {
            const key = trimmed.split('/f/')[1]?.split('?')[0];
            if (key) refs.add(key);
          }
        }
      } else if (Array.isArray(val)) {
        for (const item of val) add(item);
      }
    };

    const [
      projects,
      pastDrrs,
      districtTeam,
      partners,
      events,
      publications,
      memberProfiles,
      users,
      clubs,
      achievements,
      resources,
      contentBlocks,
    ] = await Promise.all([
      this.prisma.project.findMany({ select: { photos: true } }),
      this.prisma.pastDrr.findMany({ select: { photoUrl: true } }),
      this.prisma.districtTeamMember.findMany({ select: { photoUrl: true } }),
      this.prisma.partner.findMany({ select: { logoUrl: true } }),
      this.prisma.event.findMany({ select: { coverUrl: true, photos: true } }),
      this.prisma.publication.findMany({ select: { coverUrl: true, url: true } }),
      this.prisma.memberProfile.findMany({ select: { photoUrl: true } }),
      this.prisma.user.findMany({ select: { image: true } }),
      this.prisma.club.findMany({ select: { logoUrl: true } }),
      this.prisma.achievement.findMany({ select: { certificateUrl: true } }),
      this.prisma.resource.findMany({ select: { url: true } }),
      this.prisma.contentBlock.findMany({ select: { draftValue: true, publishedValue: true } }),
    ]);

    for (const p of projects) add(p.photos);
    for (const d of pastDrrs) add(d.photoUrl);
    for (const t of districtTeam) add(t.photoUrl);
    for (const p of partners) add(p.logoUrl);
    for (const e of events) {
      add(e.coverUrl);
      add(e.photos);
    }
    for (const pub of publications) {
      add(pub.coverUrl);
      add(pub.url);
    }
    for (const m of memberProfiles) add(m.photoUrl);
    for (const u of users) add(u.image);
    for (const c of clubs) add(c.logoUrl);
    for (const a of achievements) add(a.certificateUrl);
    for (const r of resources) add(r.url);
    for (const cb of contentBlocks) {
      if (cb.draftValue && typeof cb.draftValue === 'object') {
        const val = (cb.draftValue as Record<string, unknown>).url;
        if (typeof val === 'string') add(val);
      }
      if (cb.publishedValue && typeof cb.publishedValue === 'object') {
        const val = (cb.publishedValue as Record<string, unknown>).url;
        if (typeof val === 'string') add(val);
      }
    }

    return refs;
  }
}
