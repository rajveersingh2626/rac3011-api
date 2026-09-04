import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { env } from '../config/env';
import { DriveGatewayPort } from './drive-gateway.port';
import type { LinkCheckStatus } from './link-checker.port';

@Injectable()
export class LiveDriveGateway implements DriveGatewayPort {
  private readonly logger = new Logger('LiveDriveGateway');
  private client: ReturnType<typeof google.drive> | undefined;

  isConfigured(): boolean {
    return !!env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  }

  private getClient(): ReturnType<typeof google.drive> {
    if (this.client) return this.client;
    const json = JSON.parse(
      Buffer.from(env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ?? '', 'base64').toString('utf8'),
    ) as Record<string, string>;
    const auth = new google.auth.GoogleAuth({
      credentials: json,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    this.client = google.drive({ version: 'v3', auth });
    return this.client;
  }

  async getFile(fileId: string): Promise<LinkCheckStatus> {
    try {
      await this.getClient().files.get({ fileId, fields: 'id,mimeType' });
      return 'ok';
    } catch (err) {
      const status =
        (err as { code?: number; status?: number }).code ?? (err as { status?: number }).status;
      if (status === 403) return 'private';
      if (status === 404) return 'broken';
      this.logger.warn(`Drive lookup failed for ${fileId}: ${(err as Error).message}`);
      return 'broken';
    }
  }
}
