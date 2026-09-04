import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { UTApi } from 'uploadthing/server';
import { env } from '../../config/env';
import type { StorageTier, StoredFile } from '../storage.port';
import { StoragePort } from '../storage.port';

type PublicTier = 'permanent' | 'dynamic';
type PendingGrant = { tier: PublicTier; mimeType: string; size: number };

// UTApi has no client-presign API: the client uploads via UploadThing's hosted SDK against the
// tier's token, then PATCH /files/grants/:grantId reports the key back for this adapter to resolve.
@Injectable()
export class UploadThingAdapter extends StoragePort {
  private readonly pending = new Map<string, PendingGrant>();
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
    return Promise.resolve({ grantId, uploadUrl: `uploadthing://${tier}`, fields: { tier } });
  }

  async finalise(grantId: string, providerKey: string): Promise<StoredFile> {
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
    const separator = fileId.indexOf(':');
    if (separator === -1) throw new Error(`uploadthing storage: malformed file id ${fileId}`);
    const tier = this.assertPublicTier(fileId.slice(0, separator) as StorageTier);
    const key = fileId.slice(separator + 1);
    await this.apiFor(tier).deleteFiles(key);
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
