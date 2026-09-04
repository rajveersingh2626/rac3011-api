import { Injectable } from '@nestjs/common';
import { ContentRepository } from './content.repository';

export type PublicContentBlocks = Record<string, { type: string; value: unknown }>;

@Injectable()
export class ContentService {
  constructor(private readonly repo: ContentRepository) {}

  async publishedBlocks(pageKey: string): Promise<PublicContentBlocks> {
    const rows = await this.repo.findPublishedBlocks(pageKey);
    const out: PublicContentBlocks = {};
    for (const row of rows) out[row.sectionKey] = { type: row.type, value: row.publishedValue };
    return out;
  }

  async setting<T>(key: string, fallback: T): Promise<T> {
    const value = await this.repo.getSetting(key);
    return value === undefined ? fallback : (value as T);
  }
}
