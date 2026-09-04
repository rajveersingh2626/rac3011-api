import { Injectable, NotFoundException } from '@nestjs/common';
import { EventsRepository } from './events.repository';
import type { PublicEventRow } from './events.types';

@Injectable()
export class EventsService {
  constructor(private readonly repo: EventsRepository) {}

  listInRange(from: Date | undefined, to: Date | undefined): Promise<PublicEventRow[]> {
    return this.repo.findInRange(from, to);
  }

  async bySlug(slug: string): Promise<PublicEventRow> {
    const row = await this.repo.findBySlug(slug);
    if (!row) throw new NotFoundException();
    return row;
  }

  listAllUpcoming(): Promise<PublicEventRow[]> {
    return this.repo.findAllUpcoming();
  }
}
