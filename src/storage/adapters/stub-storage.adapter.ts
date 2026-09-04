import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { StorageTier, StoredFile } from '../storage.port';
import { StoragePort } from '../storage.port';

type StubGrant = {
  tier: StorageTier;
  mimeType: string;
  size: number;
  resourceType: string;
  resourceId?: string;
  userId: string;
};

// In-memory only: never call a real provider from tests (this network blocks TLS to *.r2.cloudflarestorage.com).
@Injectable()
export class StubStorageAdapter extends StoragePort {
  private readonly grants = new Map<string, StubGrant>();
  private readonly deleted: string[] = [];

  createUploadGrant(input: {
    tier: StorageTier;
    mimeType: string;
    size: number;
    resourceType: string;
    resourceId?: string;
    userId: string;
  }): Promise<{ grantId: string; uploadUrl: string; fields?: Record<string, string> }> {
    const grantId = randomUUID();
    this.grants.set(grantId, input);
    return Promise.resolve({ grantId, uploadUrl: `stub://upload/${grantId}`, fields: { grantId } });
  }

  finalise(grantId: string, providerKey: string): Promise<StoredFile> {
    const grant = this.grants.get(grantId);
    if (!grant) throw new Error(`stub storage: unknown grant ${grantId}`);
    this.grants.delete(grantId);
    return Promise.resolve({
      id: grantId,
      tier: grant.tier,
      key: providerKey,
      url: grant.tier === 'private' ? null : `stub://cdn/${providerKey}`,
      name: providerKey,
      mimeType: grant.mimeType,
      size: grant.size,
    });
  }

  getPrivateStream(
    fileId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; name: string }> {
    return Promise.resolve({
      stream: Readable.from([Buffer.from(`stub-content:${fileId}`)]),
      mimeType: 'application/octet-stream',
      name: fileId,
    });
  }

  delete(fileId: string): Promise<void> {
    this.deleted.push(fileId);
    return Promise.resolve();
  }

  deletedFileIds(): readonly string[] {
    return this.deleted;
  }
}
