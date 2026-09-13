import { Injectable, Module } from '@nestjs/common';
import { MeModule } from '../me/me.module';
import { env } from '../config/env';
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
  ) {
    super();
  }

  async createUploadGrant(
    input: Parameters<StoragePort['createUploadGrant']>[0],
  ): Promise<{ grantId: string; uploadUrl: string; fields?: Record<string, string> }> {
    const result = await this.forTier(input.tier).createUploadGrant(input);
    this.grantTiers.set(result.grantId, input.tier);
    return result;
  }

  finalise(grantId: string, providerKey: string): Promise<StoredFile> {
    const tier = this.grantTiers.get(grantId);
    if (!tier) throw new Error(`storage: unknown grant ${grantId}`);
    this.grantTiers.delete(grantId);
    return this.forTier(tier).finalise(grantId, providerKey);
  }

  getPrivateStream(
    fileId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; name: string }> {
    return this.r2.getPrivateStream(fileId);
  }

  delete(fileId: string): Promise<void> {
    const isUploadThing =
      fileId.includes(':') ||
      fileId.includes('/f/') ||
      fileId.includes('ufs.sh') ||
      fileId.includes('utfs.io') ||
      fileId.startsWith('dhfz');
    return isUploadThing ? this.uploadThing.delete(fileId) : this.r2.delete(fileId);
  }

  override async handleUpload(
    grantId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    tierHint?: StorageTier,
  ): Promise<{ key: string; url: string }> {
    const tier = this.grantTiers.get(grantId) ?? tierHint ?? 'permanent';
    const adapter = this.forTier(tier);
    if (adapter.handleUpload) {
      return adapter.handleUpload(grantId, file, tier);
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
  imports: [MeModule],
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
