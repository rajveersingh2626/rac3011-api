import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ScopeService } from '../common/scope/scope.service';
import type { ResolvedAccess } from '../common/types/access';
import type {
  CreateReportRequestInput,
  PutReportRequestResponseInput,
  UpdateReportRequestInput,
} from './dto/report-request.dto';
import { ReportRequestsRepository } from './report-requests.repository';
import type {
  ReportRequestAudience,
  ReportRequestResponseRow,
  ReportRequestRow,
} from './reports.types';

async function audienceMatchesClub(
  repo: ReportRequestsRepository,
  audience: unknown,
  clubId: string,
): Promise<boolean> {
  const a = (audience ?? {}) as ReportRequestAudience;
  if (a.all) return true;
  if (a.clubIds?.includes(clubId)) return true;
  if (a.zoneIds?.length) {
    const zoneId = await repo.clubZoneId(clubId);
    if (zoneId && a.zoneIds.includes(zoneId)) return true;
  }
  return false;
}

@Injectable()
export class ReportRequestsService {
  constructor(
    private readonly repo: ReportRequestsRepository,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  private callerClubId(access: ResolvedAccess): string | undefined {
    const scopes = access.grants['reports:submit'] ?? [];
    return scopes.find((s) => s.type === 'club')?.id;
  }

  async list(access: ResolvedAccess): Promise<ReportRequestRow[]> {
    const canManage = access.isSuperAdmin || (access.grants['requests:manage'] ?? []).length > 0;
    const all = await this.repo.findMany();
    if (canManage) return all;
    const clubId = this.callerClubId(access);
    if (!clubId) return [];
    const matches = await Promise.all(
      all.map((r) => audienceMatchesClub(this.repo, r.audience, clubId)),
    );
    return all.filter((_, i) => matches[i]);
  }

  async get(access: ResolvedAccess, id: string): Promise<ReportRequestRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    const canManage = access.isSuperAdmin || (access.grants['requests:manage'] ?? []).length > 0;
    if (!canManage) {
      const clubId = this.callerClubId(access);
      if (!clubId || !(await audienceMatchesClub(this.repo, row.audience, clubId)))
        throw new NotFoundException();
    }
    return row;
  }

  async create(access: ResolvedAccess, input: CreateReportRequestInput): Promise<ReportRequestRow> {
    const created = await this.repo.create({
      title: input.title,
      description: input.description ?? null,
      questions: input.questions,
      audience: input.audience,
      dueAt: new Date(input.dueAt),
      createdById: access.userId,
    });
    await this.audit.record({
      actorId: access.userId,
      action: 'report_request.created',
      resourceType: 'report_request',
      resourceId: created.id,
      after: { title: created.title, audience: created.audience },
    });
    return created;
  }

  async update(
    access: ResolvedAccess,
    id: string,
    input: UpdateReportRequestInput,
  ): Promise<ReportRequestRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    return this.repo.update(id, {
      title: input.title,
      description: input.description,
      questions: input.questions,
      audience: input.audience,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    });
  }

  async delete(access: ResolvedAccess, id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    await this.repo.delete(id);
    await this.audit.record({
      actorId: access.userId,
      action: 'report_request.deleted',
      resourceType: 'report_request',
      resourceId: id,
    });
  }

  async putResponse(
    access: ResolvedAccess,
    requestId: string,
    clubId: string,
    input: PutReportRequestResponseInput,
  ): Promise<ReportRequestResponseRow> {
    await this.scope.assertCanAccessClub(access, 'reports:submit', clubId);
    const request = await this.repo.findById(requestId);
    if (!request) throw new NotFoundException();
    if (!(await audienceMatchesClub(this.repo, request.audience, clubId)))
      throw new NotFoundException();
    return this.repo.upsertResponse(requestId, clubId, input.answers, access.userId);
  }
}
