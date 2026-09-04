export type StorageTier = 'permanent' | 'dynamic' | 'private';

export interface StoredFile {
  id: string;
  tier: StorageTier;
  key: string;
  url: string | null;
  name: string;
  mimeType: string;
  size: number;
}

export abstract class StoragePort {
  abstract createUploadGrant(input: {
    tier: StorageTier;
    mimeType: string;
    size: number;
    resourceType: string;
    resourceId?: string;
    userId: string;
  }): Promise<{ grantId: string; uploadUrl: string; fields?: Record<string, string> }>;
  abstract finalise(grantId: string, providerKey: string): Promise<StoredFile>;
  abstract getPrivateStream(
    fileId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; name: string }>;
  abstract delete(fileId: string): Promise<void>;
}
