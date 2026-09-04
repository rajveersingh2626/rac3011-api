import { Injectable, NotFoundException } from '@nestjs/common';
import { ShowcaseRepository } from './showcase.repository';
import type { PublishedProjectFilter, PublishedProjectRow } from './showcase.types';

@Injectable()
export class ShowcaseService {
  constructor(private readonly repo: ShowcaseRepository) {}

  list(
    filter: PublishedProjectFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: PublishedProjectRow[]; total: number }> {
    return this.repo.findMany(filter, page, pageSize);
  }

  async bySlug(slug: string): Promise<PublishedProjectRow> {
    const row = await this.repo.findBySlug(slug);
    if (!row) throw new NotFoundException();
    return row;
  }

  latest(take: number): Promise<PublishedProjectRow[]> {
    return this.repo.findLatestPublished(take);
  }
}
