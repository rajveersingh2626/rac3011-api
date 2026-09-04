import { Injectable } from '@nestjs/common';
import { PublicationsRepository } from './publications.repository';
import type { PublicationRow } from './publications.types';

@Injectable()
export class PublicationsService {
  constructor(private readonly repo: PublicationsRepository) {}

  list(): Promise<PublicationRow[]> {
    return this.repo.findAll();
  }
}
