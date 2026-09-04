import { Injectable } from '@nestjs/common';
import { DriveGatewayPort } from './drive-gateway.port';
import { followGetOk, httpCheck } from './http-checker.util';
import { LinkCheckerPort, LinkCheckStatus } from './link-checker.port';

const DRIVE_HOSTS = ['drive.google.com', 'docs.google.com'];
const PHOTOS_HOSTS = ['photos.app.goo.gl', 'photos.google.com'];

export function extractDriveFileId(url: string): string | null {
  const byPath = /\/d\/([\w-]+)/.exec(url);
  if (byPath) return byPath[1];
  const byQuery = /[?&]id=([\w-]+)/.exec(url);
  return byQuery ? byQuery[1] : null;
}

@Injectable()
export class CompositeLinkChecker implements LinkCheckerPort {
  constructor(private readonly drive: DriveGatewayPort) {}

  async check(url: string): Promise<LinkCheckStatus> {
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      return 'broken';
    }
    if (DRIVE_HOSTS.includes(host) && this.drive.isConfigured()) {
      const fileId = extractDriveFileId(url);
      if (!fileId) return 'broken';
      return this.drive.getFile(fileId);
    }
    if (PHOTOS_HOSTS.includes(host)) return followGetOk(url);
    return httpCheck(url);
  }
}
