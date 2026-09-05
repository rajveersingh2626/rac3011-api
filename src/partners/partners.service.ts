import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PartnersRepository } from './partners.repository';
import type { PartnerRow } from './partners.types';
import type { CreatePartnerInput, UpdatePartnerInput } from './dto/partner.dto';

@Injectable()
export class PartnersService {
  constructor(
    private readonly repo: PartnersRepository,
    private readonly audit: AuditService,
  ) {}

  list(): Promise<PartnerRow[]> {
    return this.repo.findAll();
  }

  async get(id: string): Promise<PartnerRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(actorId: string, input: CreatePartnerInput): Promise<PartnerRow> {
    const row = await this.repo.create(input);
    await this.audit.record({
      actorId,
      action: 'partner.created',
      resourceType: 'partner',
      resourceId: row.id,
      after: row,
    });
    return row;
  }

  async update(actorId: string, id: string, input: UpdatePartnerInput): Promise<PartnerRow> {
    const before = await this.get(id);
    const row = await this.repo.update(id, input);
    await this.audit.record({
      actorId,
      action: 'partner.updated',
      resourceType: 'partner',
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
      action: 'partner.deleted',
      resourceType: 'partner',
      resourceId: id,
      before,
    });
  }

  async reorder(actorId: string, ids: string[]): Promise<PartnerRow[]> {
    await this.repo.reorder(ids);
    const items = await this.list();
    await this.audit.record({
      actorId,
      action: 'partner.reordered',
      resourceType: 'partner',
      after: { ids },
    });
    return items;
  }
}
