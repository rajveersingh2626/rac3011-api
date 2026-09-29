import { Injectable, Module, Optional } from '@nestjs/common';
import { env } from '../config/env';
import { LimitAlertService } from '../notifications/limit-alert.service';
import { R2Adapter } from './adapters/r2.adapter';
import { StubStorageAdapter } from './adapters/stub-storage.adapter';
import { UploadThingAdapter } from './adapters/uploadthing.adapter';
import { StorageController } from './storage.controller';
import { StorageRepository } from './storage.repository';
import { StorageService } from './storage.service';
import type { StorageTier, StoredFile } from './storage.port';
import { StoragePort } from './storage.port';

// STORAGE_DRIVER=stub is the default: this dev network blocks TLS to *.r2.cloudflarestorage.com,
// so live UploadThing/R2 adapters are only exercised via STORAGE_DRIVER=live on the VPS.
@Injectable()
class TieredStoragePort extends StoragePort {
  private readonly grantTiers = new Map<string, StorageTier>();

  constructor(
    private readonly uploadThing: UploadThingAdapter,
    private readonly r2: R2Adapter,
    @Optional() private readonly limitAlert?: LimitAlertService,
  ) {
    super();
  }

  async createUploadGrant(
    input: Parameters<StoragePort['createUploadGrant']>[0],
  ): Promise<{ grantId: string; uploadUrl: string; fields?: Record<string, string> }> {
    const adapter = this.forTier(input.tier);
    const adapterName = input.tier === 'private' ? 'r2' : 'uploadthing';
    try {
      const result = await adapter.createUploadGrant(input);
      this.grantTiers.set(result.grantId, input.tier);
      return result;
    } catch (err: unknown) {
      void this.limitAlert?.onStorageError(adapterName, 'createUploadGrant', err as Error);
      throw err;
    }
  }

  async finalise(grantId: string, providerKey: string): Promise<StoredFile> {
    const tier = this.grantTiers.get(grantId);
    if (!tier) throw new Error(`storage: unknown grant ${grantId}`);
    this.grantTiers.delete(grantId);
    const adapterName = tier === 'private' ? 'r2' : 'uploadthing';
    try {
      return await this.forTier(tier).finalise(grantId, providerKey);
    } catch (err: unknown) {
      void this.limitAlert?.onStorageError(adapterName, 'finalise', err as Error);
      throw err;
    }
  }

  async getPrivateStream(
    fileId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; name: string }> {
    try {
      return await this.r2.getPrivateStream(fileId);
    } catch (err: unknown) {
      void this.limitAlert?.onStorageError('r2', 'getPrivateStream', err as Error);
      throw err;
    }
  }

  async delete(fileId: string): Promise<void> {
    const isUploadThing =
      fileId.includes(':') ||
      fileId.includes('/f/') ||
      fileId.includes('ufs.sh') ||
      fileId.includes('utfs.io') ||
      fileId.startsWith('dhfz');
    const adapterName = isUploadThing ? 'uploadthing' : 'r2';
    try {
      return isUploadThing ? await this.uploadThing.delete(fileId) : await this.r2.delete(fileId);
    } catch (err: unknown) {
      void this.limitAlert?.onStorageError(adapterName, 'delete', err as Error);
      throw err;
    }
  }

  override async handleUpload(
    grantId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    tierHint?: StorageTier,
  ): Promise<{ key: string; url: string }> {
    const tier = this.grantTiers.get(grantId) ?? tierHint ?? 'permanent';
    const adapter = this.forTier(tier);
    if (adapter.handleUpload) {
      try {
        return await adapter.handleUpload(grantId, file, tier);
      } catch (err: unknown) {
        const adapterName = tier === 'private' ? 'r2' : 'uploadthing';
        void this.limitAlert?.onStorageError(adapterName, 'handleUpload', err as Error);
        throw err;
      }
    }
    throw new Error(`Adapter for tier ${tier} does not support direct upload`);
  }

  private forTier(tier: StorageTier): StoragePort {
    return tier === 'private' ? this.r2 : this.uploadThing;
  }
}

const portProvider =
  env.STORAGE_DRIVER === 'live'
    ? { provide: StoragePort, useClass: TieredStoragePort }
    : { provide: StoragePort, useExisting: StubStorageAdapter };

@Module({
  controllers: [StorageController],
  providers: [
    StorageRepository,
    StorageService,
    StubStorageAdapter,
    UploadThingAdapter,
    R2Adapter,
    portProvider,
  ],
  exports: [StorageService],
})
export class StorageModule {}
