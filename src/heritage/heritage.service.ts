import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CodedConflictException } from '../common/errors/conflict.error';
import { HeritageRepository } from './heritage.repository';
import type { PastDrrRow } from './heritage.types';
import type { CreatePastDrrInput, UpdatePastDrrInput } from './dto/past-drr.dto';

@Injectable()
export class HeritageService {
  constructor(
    private readonly repo: HeritageRepository,
    private readonly audit: AuditService,
  ) {}

  list(): Promise<PastDrrRow[]> {
    return this.repo.findAll();
  }

  async bySlug(slug: string): Promise<PastDrrRow> {
    const row = await this.repo.findBySlug(slug);
    if (!row) throw new NotFoundException();
    return row;
  }

  async get(id: string): Promise<PastDrrRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(actorId: string, input: CreatePastDrrInput): Promise<PastDrrRow> {
    if (await this.repo.findBySlug(input.slug)) {
      throw new CodedConflictException('ALREADY_EXISTS', 'A past DRR with this slug exists');
    }
    const row = await this.repo.create(input);
    await this.audit.record({
      actorId,
      action: 'past_drr.created',
      resourceType: 'past_drr',
      resourceId: row.id,
      after: row,
    });
    return row;
  }

  async update(actorId: string, id: string, input: UpdatePastDrrInput): Promise<PastDrrRow> {
    const before = await this.get(id);
    if (input.slug && input.slug !== before.slug && (await this.repo.findBySlug(input.slug))) {
      throw new CodedConflictException('ALREADY_EXISTS', 'A past DRR with this slug exists');
    }
    const row = await this.repo.update(id, input);
    await this.audit.record({
      actorId,
      action: 'past_drr.updated',
      resourceType: 'past_drr',
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
      action: 'past_drr.deleted',
      resourceType: 'past_drr',
      resourceId: id,
      before,
    });
  }

  async reorder(actorId: string, ids: string[]): Promise<PastDrrRow[]> {
    await this.repo.reorder(ids);
    const items = await this.list();
    await this.audit.record({
      actorId,
      action: 'past_drr.reordered',
      resourceType: 'past_drr',
      after: { ids },
    });
    return items;
  }
}
