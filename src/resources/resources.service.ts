import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ResourcesRepository } from './resources.repository';
import type { ResourceRow } from './resources.types';
import type { CreateResourceInput, UpdateResourceInput } from './dto/resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly repo: ResourcesRepository,
    private readonly audit: AuditService,
  ) {}

  list(): Promise<ResourceRow[]> {
    return this.repo.findAll();
  }

  async get(id: string): Promise<ResourceRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(actorId: string, input: CreateResourceInput): Promise<ResourceRow> {
    const row = await this.repo.create(input);
    await this.audit.record({
      actorId,
      action: 'resource.created',
      resourceType: 'resource',
      resourceId: row.id,
      after: row,
    });
    return row;
  }

  async update(actorId: string, id: string, input: UpdateResourceInput): Promise<ResourceRow> {
    const before = await this.get(id);
    const row = await this.repo.update(id, input);
    await this.audit.record({
      actorId,
      action: 'resource.updated',
      resourceType: 'resource',
      resourceId: id,
      before,
      after: row,
    });
    return row;
  }

  async remove(actorId: string, id: string): Promise<void> {
    const before = await this.get(id);
    await this.repo.delete(id);
    await this.audit.record({
      actorId,
      action: 'resource.deleted',
      resourceType: 'resource',
      resourceId: id,
      before,
    });
  }

  async reorder(actorId: string, ids: string[]): Promise<ResourceRow[]> {
    await this.repo.reorder(ids);
    const items = await this.list();
    await this.audit.record({
      actorId,
      action: 'resource.reordered',
      resourceType: 'resource',
      after: { ids },
    });
    return items;
  }
}
