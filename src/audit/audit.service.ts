import { Injectable } from '@nestjs/common';
import { AuditFilter, AuditRepository, AuditRow } from './audit.repository';

export type AuditInput = {
  actorId: string | null | undefined;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
};

@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async record(input: AuditInput): Promise<void> {
    await this.repo.insert({
      actorId: input.actorId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
    });
  }

  list(
    filter: AuditFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: AuditRow[]; total: number }> {
    return this.repo.list(filter, page, pageSize);
  }
}
