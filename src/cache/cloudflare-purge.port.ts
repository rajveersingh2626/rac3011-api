export abstract class CloudflarePurgeClient {
  abstract purgeUrls(urls: string[]): Promise<void>;
  abstract purgePrefix(prefix: string): Promise<void>;
}
