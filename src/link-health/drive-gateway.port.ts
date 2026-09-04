import type { LinkCheckStatus } from './link-checker.port';

export abstract class DriveGatewayPort {
  abstract isConfigured(): boolean;
  abstract getFile(fileId: string): Promise<LinkCheckStatus>;
}
