import { Injectable } from '@nestjs/common';
import { ResourcesRepository } from './resources.repository';
import type { ResourceRow } from './resources.types';

@Injectable()
export class ResourcesService {
  constructor(private readonly repo: ResourcesRepository) {}

  list(): Promise<ResourceRow[]> {
    return this.repo.findAll();
  }
}
