import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { UTApi, UTFile } from 'uploadthing/server';
import { env } from '../../config/env';
import type { StorageTier, StoredFile } from '../storage.port';
import { StoragePort } from '../storage.port';

type PublicTier = 'permanent' | 'dynamic';
type PendingGrant = { tier: PublicTier; mimeType: string; size: number };
type UploadedFileRecord = {
  tier: PublicTier;
  key: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

@Injectable()
export class UploadThingAdapter extends StoragePort {
  private readonly pending = new Map<string, PendingGrant>();
  private readonly uploaded = new Map<string, UploadedFileRecord>();
  private permanentApi?: UTApi;
  private dynamicApi?: UTApi;

  createUploadGrant(input: {
    tier: StorageTier;
    mimeType: string;
    size: number;
    resourceType: string;
    resourceId?: string;
    userId: string;
  }): Promise<{ grantId: string; uploadUrl: string; fields?: Record<string, string> }> {
    const tier = this.assertPublicTier(input.tier);
    const grantId = randomUUID();
    this.pending.set(grantId, { tier, mimeType: input.mimeType, size: input.size });
    return Promise.resolve({
      grantId,
      uploadUrl: `/files/upload/${grantId}`,
      fields: { key: grantId },
    });
  }

  override async handleUpload(
    grantId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    tierHint?: StorageTier,
  ): Promise<{ key: string; url: string }> {
    const grant = this.pending.get(grantId);
    const tier = grant?.tier ?? (tierHint && tierHint !== 'private' ? tierHint : 'permanent');
    const filename = file.originalname || 'upload.webp';
    const utFile = new UTFile([new Uint8Array(file.buffer)], filename, { type: file.mimetype });

    const res = await this.apiFor(tier).uploadFiles(utFile);
    if (res.error) {
      throw new Error(`uploadthing upload failed: ${res.error.message}`);
    }
    if (!res.data) {
      throw new Error('uploadthing storage: no data returned from upload');
    }

    const key = res.data.key;
    const url = res.data.ufsUrl || res.data.url;
    this.uploaded.set(grantId, {
      tier,
      key,
      url,
      name: file.originalname || key,
      mimeType: file.mimetype,
      size: file.size,
    });

    return { key, url };
  }

  async finalise(grantId: string, providerKey: string): Promise<StoredFile> {
    const uploaded = this.uploaded.get(grantId);
    if (uploaded) {
      this.uploaded.delete(grantId);
      this.pending.delete(grantId);
      return {
        id: `${uploaded.tier}:${uploaded.key}`,
        tier: uploaded.tier,
        key: uploaded.key,
        url: uploaded.url,
        name: uploaded.name,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
      };
    }

    const grant = this.pending.get(grantId);
    if (!grant) throw new Error(`uploadthing storage: unknown grant ${grantId}`);
    this.pending.delete(grantId);
    const { data } = await this.apiFor(grant.tier).getFileUrls(providerKey);
    const url = data[0]?.url;
    if (!url) throw new Error(`uploadthing storage: no url returned for key ${providerKey}`);
    return {
      id: `${grant.tier}:${providerKey}`,
      tier: grant.tier,
      key: providerKey,
      url,
      name: providerKey,
      mimeType: grant.mimeType,
      size: grant.size,
    };
  }

  getPrivateStream(): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; name: string }> {
    return Promise.reject(new Error('uploadthing storage does not serve the private tier'));
  }

  async delete(fileId: string): Promise<void> {
    if (!fileId) return;

    let key = fileId;
    let explicitTier: PublicTier | null = null;

    // Handle full URLs like https://hi0o78q25u.ufs.sh/f/<key> or https://utfs.io/f/<key>
    if (key.includes('/f/')) {
      const parts = key.split('/f/');
      key = parts[1]?.split('?')[0] || key;
    }

    const separator = key.indexOf(':');
    if (separator !== -1) {
      const tierPrefix = key.slice(0, separator);
      if (tierPrefix === 'permanent' || tierPrefix === 'dynamic') {
        explicitTier = tierPrefix as PublicTier;
        key = key.slice(separator + 1);
      }
    }

    if (explicitTier) {
      try {
        await this.apiFor(explicitTier).deleteFiles(key);
      } catch (err) {
        // Log or suppress if already deleted
      }
      return;
    }

    // If no explicit tier, attempt deleting from both configured tiers
    const promises: Promise<unknown>[] = [];
    if (env.UPLOADTHING_TOKEN_PERMANENT) {
      promises.push(
        this.apiFor('permanent')
          .deleteFiles(key)
          .catch(() => {}),
      );
    }
    if (env.UPLOADTHING_TOKEN_DYNAMIC) {
      promises.push(
        this.apiFor('dynamic')
          .deleteFiles(key)
          .catch(() => {}),
      );
    }
    await Promise.all(promises);
  }

  private assertPublicTier(tier: StorageTier): PublicTier {
    if (tier === 'private')
      throw new Error('uploadthing storage only serves the permanent/dynamic tiers');
    return tier;
  }

  private apiFor(tier: PublicTier): UTApi {
    if (tier === 'permanent') {
      if (!env.UPLOADTHING_TOKEN_PERMANENT)
        throw new Error('UPLOADTHING_TOKEN_PERMANENT is not configured');
      this.permanentApi ??= new UTApi({ token: env.UPLOADTHING_TOKEN_PERMANENT });
      return this.permanentApi;
    }
    if (!env.UPLOADTHING_TOKEN_DYNAMIC)
      throw new Error('UPLOADTHING_TOKEN_DYNAMIC is not configured');
    this.dynamicApi ??= new UTApi({ token: env.UPLOADTHING_TOKEN_DYNAMIC });
    return this.dynamicApi;
  }
}
