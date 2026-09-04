import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import type { StorageTier, StoredFile } from '../storage.port';
import { StoragePort } from '../storage.port';

type PendingGrant = { mimeType: string; size: number; key: string };

@Injectable()
export class R2Adapter extends StoragePort {
  private readonly pending = new Map<string, PendingGrant>();
  private client?: S3Client;

  async createUploadGrant(input: {
    tier: StorageTier;
    mimeType: string;
    size: number;
    resourceType: string;
    resourceId?: string;
    userId: string;
  }): Promise<{ grantId: string; uploadUrl: string; fields?: Record<string, string> }> {
    if (input.tier !== 'private') throw new Error('R2Adapter only serves the private tier');
    const grantId = randomUUID();
    const key = `${input.resourceType}/${input.resourceId ?? 'unassigned'}/${grantId}`;
    this.pending.set(grantId, { mimeType: input.mimeType, size: input.size, key });
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_PRIVATE,
      Key: key,
      ContentType: input.mimeType,
      ContentLength: input.size,
    });
    const uploadUrl = await getSignedUrl(this.s3(), command, { expiresIn: 900 });
    return { grantId, uploadUrl, fields: { key } };
  }

  finalise(grantId: string, providerKey: string): Promise<StoredFile> {
    const grant = this.pending.get(grantId);
    if (!grant) throw new Error(`r2 storage: unknown grant ${grantId}`);
    this.pending.delete(grantId);
    return Promise.resolve({
      id: providerKey,
      tier: 'private',
      key: providerKey,
      url: null,
      name: providerKey,
      mimeType: grant.mimeType,
      size: grant.size,
    });
  }

  async getPrivateStream(
    fileId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; name: string }> {
    const command = new GetObjectCommand({ Bucket: env.R2_BUCKET_PRIVATE, Key: fileId });
    const response = await this.s3().send(command);
    if (!response.Body) throw new Error(`r2 storage: empty body for ${fileId}`);
    return {
      stream: response.Body as NodeJS.ReadableStream,
      mimeType: response.ContentType ?? 'application/octet-stream',
      name: fileId,
    };
  }

  async delete(fileId: string): Promise<void> {
    await this.s3().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_PRIVATE, Key: fileId }));
  }

  private s3(): S3Client {
    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials are not configured');
    }
    this.client ??= new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    });
    return this.client;
  }
}
