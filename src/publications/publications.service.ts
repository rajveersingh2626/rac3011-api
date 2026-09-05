import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PublicationsRepository } from './publications.repository';
import type { PublicationRow } from './publications.types';
import type { CreatePublicationInput, UpdatePublicationInput } from './dto/publication.dto';

@Injectable()
export class PublicationsService {
  constructor(
    private readonly repo: PublicationsRepository,
    private readonly audit: AuditService,
  ) {}

  list(): Promise<PublicationRow[]> {
    return this.repo.findAll();
  }

  async get(id: string): Promise<PublicationRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(actorId: string, input: CreatePublicationInput): Promise<PublicationRow> {
    const row = await this.repo.create(input);
    await this.audit.record({
      actorId,
      action: 'publication.created',
      resourceType: 'publication',
      resourceId: row.id,
      after: row,
    });
    return row;
  }

  async update(
    actorId: string,
    id: string,
    input: UpdatePublicationInput,
  ): Promise<PublicationRow> {
    const before = await this.get(id);
    const row = await this.repo.update(id, input);
    await this.audit.record({
      actorId,
      action: 'publication.updated',
      resourceType: 'publication',
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
      action: 'publication.deleted',
      resourceType: 'publication',
      resourceId: id,
      before,
    });
  }
}
