export type LinkCheckStatus = 'ok' | 'broken' | 'private';

export abstract class LinkCheckerPort {
  abstract check(url: string): Promise<LinkCheckStatus>;
}
