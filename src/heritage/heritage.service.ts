import { Injectable, NotFoundException } from '@nestjs/common';
import { HeritageRepository } from './heritage.repository';
import type { PastDrrRow } from './heritage.types';

@Injectable()
export class HeritageService {
  constructor(private readonly repo: HeritageRepository) {}

  list(): Promise<PastDrrRow[]> {
    return this.repo.findAll();
  }

  async bySlug(slug: string): Promise<PastDrrRow> {
    const row = await this.repo.findBySlug(slug);
    if (!row) throw new NotFoundException();
    return row;
  }
}
