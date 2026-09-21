import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { NotificationPort } from '../notifications/notification.port';
import { ScopeService } from '../common/scope/scope.service';
import type { ResolvedAccess } from '../common/types/access';
import { currentRyYear, firstOfCurrentMonth, getRyMonths, ryYearOf } from '../common/ry-year';
import type {
  CreateReportFlagsInput,
  CreateReportInput,
  ResetReportInput,
  UpdateReportInput,
} from './dto/report.dto';
import { isFiledOnTime } from './report-deadline';
import { ReportSchemasService } from './report-schemas.service';
import type { AssistResult } from './assist/assist.port';
import { AssistPort } from './assist/assist.port';
import type { ReportIncludes } from './reports.repository';
import { ReportsRepository } from './reports.repository';
import {
  REPORT_DELETED_EVENT,
  REPORT_QUERIED_EVENT,
  REPORT_RESET_EVENT,
  REPORT_SUBMITTED_EVENT,
} from './report.events';
import type {
  ReportingMonthInfo,
  ReportListFilter,
  ReportReviewFlag,
  ReportWithRelations,
} from './reports.types';
import { collectClubIdsInValues, validateReportValues } from './report-values.validator';

const READ_PERMISSIONS = ['reports:submit', 'reports:review', 'reports:manage'] as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly repo: ReportsRepository,
    private readonly schemas: ReportSchemasService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationPort,
    private readonly events: EventEmitter2,
    private readonly assistPort: AssistPort,
  ) {}

  async list(
    access: ResolvedAccess,
    filter: ReportListFilter,
    include: ReportIncludes,
    page: number,
    pageSize: number,
  ): Promise<{ items: ReportWithRelations[]; total: number }> {
    const scope = await this.scope.clubFilterAny(access, [...READ_PERMISSIONS]);
    const narrowed = ScopeService.narrowClubs(scope, filter.clubId);
    if ('clubIds' in narrowed && narrowed.clubIds.length === 0) return { items: [], total: 0 };
    return this.repo.findMany(filter, narrowed, include, page, pageSize);
  }

  async get(
    access: ResolvedAccess,
    id: string,
    include: ReportIncludes,
  ): Promise<ReportWithRelations> {
    const report = await this.repo.findById(id, include);
    if (!report) throw new NotFoundException();
    await this.scope.assertCanAccessClubAny(access, [...READ_PERMISSIONS], report.clubId);
    return report;
  }

  getActiveReportingMonths(): ReportingMonthInfo[] {
    const now = new Date();
    const activeRy = currentRyYear(now);
    return getRyMonths(activeRy, now);
  }

  async create(access: ResolvedAccess, input: CreateReportInput): Promise<ReportWithRelations> {
    await this.scope.assertCanAccessClub(access, 'reports:submit', input.clubId);
    const now = new Date();
    const activeRy = currentRyYear(now);
    const month = new Date(`${input.month}-01T00:00:00Z`);
    const reportRy = ryYearOf(month);
    if (reportRy !== activeRy) {
      throw new BadRequestException({
        code: 'INVALID_REPORTING_YEAR',
        message: `Report month must be within the active reporting year (${activeRy}-${activeRy + 1})`,
      });
    }
    const firstOfCurrent = firstOfCurrentMonth(now);
    if (month > firstOfCurrent) {
      throw new BadRequestException({
        code: 'FUTURE_MONTH_LOCKED',
        message: 'Cannot create or submit reports for future months',
      });
    }

    const existing = await this.repo.findByClubMonth(input.clubId, month);
    if (existing)
      throw new ConflictException({
        code: 'ALREADY_EXISTS',
        message: 'A report for this month already exists',
      });
    const schema = await this.schemas.getActive();
    const created = await this.repo.create({
      clubId: input.clubId,
      ryYear: reportRy,
      month,
      schemaVersion: schema.version,
      values: { activities: [] },
    });
    const report = await this.repo.findById(created.id);
    if (!report) throw new NotFoundException();
    return report;
  }

  async update(
    access: ResolvedAccess,
    id: string,
    input: UpdateReportInput,
  ): Promise<ReportWithRelations> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    await this.scope.assertCanAccessClub(access, 'reports:submit', existing.clubId);

    if (input.status === 'submitted') {
      const now = new Date();
      const activeRy = currentRyYear(now);
      const firstOfCurrent = firstOfCurrentMonth(now);
      if (existing.month > firstOfCurrent) {
        throw new BadRequestException({
          code: 'FUTURE_MONTH_LOCKED',
          message: 'Cannot submit a report for a future month',
        });
      }
      if (ryYearOf(existing.month) !== activeRy) {
        throw new BadRequestException({
          code: 'INVALID_REPORTING_YEAR',
          message: 'Cannot submit a report outside the active reporting year',
        });
      }
    }

    if (
      input.status === 'submitted' &&
      existing.status !== 'draft' &&
      existing.status !== 'queried'
    ) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Cannot submit a ${existing.status} report`,
      });
    }
    const isEditable = existing.status === 'draft' || existing.status === 'queried';
    if ((input.values !== undefined || input.notes !== undefined) && !isEditable) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Cannot edit a ${existing.status} report`,
      });
    }

    const nextValues =
      input.values !== undefined
        ? { ...(existing.values as object), ...input.values }
        : existing.values;

    if (input.values !== undefined || input.status === 'submitted') {
      const schema = await this.schemas.getByVersion(existing.schemaVersion);
      const clubIds = collectClubIdsInValues(schema.fields, nextValues);
      const validClubIds = await this.repo.findExistingClubIds(clubIds);
      const result = validateReportValues(schema.fields, nextValues, validClubIds);
      if (!result.valid)
        throw new BadRequestException({
          statusCode: 400,
          error: 'ValidationError',
          details: result.errors,
        });
    }

    const submittedAt = input.status === 'submitted' ? new Date() : undefined;
    let filedOnTime: boolean | null | undefined;
    if (input.status === 'submitted') {
      const deadlineDay = await this.repo.getReportDeadlineDay();
      filedOnTime = isFiledOnTime(existing.month, submittedAt as Date, deadlineDay);
    }

    const updated = await this.repo.update(id, {
      values: input.values !== undefined ? nextValues : undefined,
      notes: input.notes !== undefined ? input.notes : undefined,
      status: input.status,
      submittedById: input.status === 'submitted' ? access.userId : undefined,
      submittedAt,
      filedOnTime,
    });

    if (input.status === 'submitted') {
      this.events.emit(REPORT_SUBMITTED_EVENT, {
        reportId: updated.id,
        clubId: updated.clubId,
        ryYear: updated.ryYear,
        month: updated.month.toISOString().slice(0, 10),
        schemaVersion: updated.schemaVersion,
        submittedById: updated.submittedById,
        submittedAt: updated.submittedAt?.toISOString(),
        filedOnTime: updated.filedOnTime,
      });
    }

    const withRelations = await this.repo.findById(id);
    if (!withRelations) throw new NotFoundException();
    return withRelations;
  }

  async addQuery(
    access: ResolvedAccess,
    reportId: string,
    question: string,
  ): Promise<ReportWithRelations> {
    const report = await this.repo.findById(reportId);
    if (!report) throw new NotFoundException();
    await this.scope.assertCanAccessClub(access, 'reports:review', report.clubId);
    if (report.status !== 'submitted') {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Cannot query a ${report.status} report`,
      });
    }
    const query = await this.repo.addQuery(reportId, access.userId, question);
    await this.repo.update(reportId, { status: 'queried' });
    await this.audit.record({
      actorId: access.userId,
      action: 'report.queried',
      resourceType: 'report',
      resourceId: reportId,
      after: { question },
    });
    this.events.emit(REPORT_QUERIED_EVENT, {
      reportId,
      queryId: query.id,
      clubId: report.clubId,
      askedById: access.userId,
      question,
    });
    if (report.submittedById) {
      await this.notifications.notify({
        template: 'report-queried',
        to: [{ userId: report.submittedById }],
        data: { reportId, question },
      });
    }
    const withRelations = await this.repo.findById(reportId, { queries: true });
    if (!withRelations) throw new NotFoundException();
    return withRelations;
  }

  async replyQuery(
    access: ResolvedAccess,
    reportId: string,
    queryId: string,
    reply: string,
  ): Promise<ReportWithRelations> {
    const report = await this.repo.findById(reportId);
    if (!report) throw new NotFoundException();
    await this.scope.assertCanAccessClub(access, 'reports:submit', report.clubId);
    const query = await this.repo.findQueryById(queryId);
    if (!query || query.reportId !== reportId) throw new NotFoundException();
    if (query.reply)
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: 'This query already has a reply',
      });

    await this.repo.replyQuery(queryId, reply, access.userId);
    await this.repo.update(reportId, { status: 'submitted' });
    await this.audit.record({
      actorId: access.userId,
      action: 'report.query_replied',
      resourceType: 'report',
      resourceId: reportId,
      after: { queryId, reply },
    });
    await this.notifications.notify({
      template: 'report-replied',
      to: [{ userId: query.askedById }],
      data: { reportId, queryId, reply },
    });
    const withRelations = await this.repo.findById(reportId, { queries: true });
    if (!withRelations) throw new NotFoundException();
    return withRelations;
  }

  async assist(access: ResolvedAccess, reportId: string): Promise<AssistResult> {
    const report = await this.repo.findById(reportId, { club: true });
    if (!report) throw new NotFoundException();
    await this.scope.assertCanAccessClub(access, 'reports:score', report.clubId);
    return this.assistPort.assist({
      clubName: report.club?.name ?? report.clubId,
      month: report.month.toISOString().slice(0, 7),
      values: report.values,
      notes: report.notes,
    });
  }

  async reset(
    access: ResolvedAccess,
    id: string,
    input: ResetReportInput,
  ): Promise<ReportWithRelations> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    await this.scope.assertCanAccessClubAny(
      access,
      ['reports:manage', 'reports:review', 'reports:score'],
      existing.clubId,
    );

    const nextValues = input.clearValues !== false ? { activities: [] } : existing.values;
    const nextNotes = input.clearValues !== false ? null : existing.notes;
    const resetAt = new Date();

    const updated = await this.repo.update(id, {
      status: 'draft',
      values: nextValues,
      notes: nextNotes,
      flags: null,
      submittedAt: null,
      submittedById: null,
      filedOnTime: null,
      scoredAt: null,
    });

    await this.audit.record({
      actorId: access.userId,
      action: 'report.reset',
      resourceType: 'report',
      resourceId: id,
      before: {
        status: existing.status,
        values: existing.values,
        notes: existing.notes,
        submittedAt: existing.submittedAt,
        submittedById: existing.submittedById,
      },
      after: {
        status: 'draft',
        reason: input.reason ?? null,
        clearValues: input.clearValues !== false,
        resetAt: resetAt.toISOString(),
        resetById: access.userId,
      },
    });

    this.events.emit(REPORT_RESET_EVENT, {
      reportId: id,
      clubId: existing.clubId,
      ryYear: existing.ryYear,
      month: existing.month.toISOString().slice(0, 10),
      resetById: access.userId,
      reason: input.reason,
    });

    if (existing.submittedById) {
      await this.notifications.notify({
        template: 'report-queried',
        to: [{ userId: existing.submittedById }],
        data: {
          reportId: id,
          question: input.reason || 'Report was reset by district administration for refilling.',
        },
      });
    }

    const withRelations = await this.repo.findById(id, { club: true });
    if (!withRelations) throw new NotFoundException();
    return withRelations;
  }

  async delete(access: ResolvedAccess, id: string, reason?: string): Promise<{ success: boolean }> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    await this.scope.assertCanAccessClubAny(
      access,
      ['reports:manage', 'reports:score'],
      existing.clubId,
    );

    await this.audit.record({
      actorId: access.userId,
      action: 'report.deleted',
      resourceType: 'report',
      resourceId: id,
      before: {
        id: existing.id,
        clubId: existing.clubId,
        ryYear: existing.ryYear,
        month: existing.month.toISOString().slice(0, 10),
        status: existing.status,
        values: existing.values,
        notes: existing.notes,
        submittedAt: existing.submittedAt,
        submittedById: existing.submittedById,
        reason: reason ?? null,
      },
    });

    await this.repo.delete(id);

    this.events.emit(REPORT_DELETED_EVENT, {
      reportId: id,
      clubId: existing.clubId,
      ryYear: existing.ryYear,
      month: existing.month.toISOString().slice(0, 10),
      deletedById: access.userId,
      reason,
    });

    return { success: true };
  }

  async setFlags(
    access: ResolvedAccess,
    id: string,
    input: CreateReportFlagsInput,
  ): Promise<ReportWithRelations> {
    const report = await this.repo.findById(id);
    if (!report) throw new NotFoundException();
    await this.scope.assertCanAccessClubAny(
      access,
      ['reports:manage', 'reports:review', 'reports:score'],
      report.clubId,
    );

    if (report.status !== 'submitted' && report.status !== 'queried') {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Cannot flag a ${report.status} report`,
      });
    }

    const existingFlags: ReportReviewFlag[] = Array.isArray(report.flags)
      ? (report.flags as ReportReviewFlag[])
      : [];

    const newFlags: ReportReviewFlag[] = input.flags.map((f) => ({
      id: `flag_${Math.random().toString(36).slice(2, 11)}`,
      targetType: f.targetType,
      fieldKey: f.fieldKey,
      activityIndex: f.activityIndex,
      activityFieldKey: f.activityFieldKey,
      section: f.section,
      comment: f.comment,
      status: 'flagged',
      flaggedById: access.userId,
      flaggedAt: new Date().toISOString(),
    }));

    const updatedFlags = [...existingFlags, ...newFlags];
    await this.repo.update(id, {
      status: 'queried',
      flags: updatedFlags,
    });

    await this.audit.record({
      actorId: access.userId,
      action: 'report.flagged',
      resourceType: 'report',
      resourceId: id,
      after: { flags: newFlags, reason: input.reason },
    });

    this.events.emit(REPORT_QUERIED_EVENT, {
      reportId: id,
      clubId: report.clubId,
      askedById: access.userId,
      question: input.reason || `Flagged ${newFlags.length} item(s) for correction`,
    });

    if (report.submittedById) {
      await this.notifications.notify({
        template: 'report-queried',
        to: [{ userId: report.submittedById }],
        data: {
          reportId: id,
          question: input.reason || `${newFlags.length} item(s) were flagged for review by the district.`,
        },
      });
    }

    const withRelations = await this.repo.findById(id, { queries: true, club: true });
    if (!withRelations) throw new NotFoundException();
    return withRelations;
  }

  async resolveFlag(
    access: ResolvedAccess,
    id: string,
    flagId: string,
    reply?: string,
  ): Promise<ReportWithRelations> {
    const report = await this.repo.findById(id);
    if (!report) throw new NotFoundException();
    await this.scope.assertCanAccessClubAny(
      access,
      ['reports:submit', 'reports:review', 'reports:manage'],
      report.clubId,
    );

    const existingFlags: ReportReviewFlag[] = Array.isArray(report.flags)
      ? (report.flags as ReportReviewFlag[])
      : [];

    const target = existingFlags.find((f) => f.id === flagId);
    if (!target) throw new NotFoundException('Flag not found');

    target.status = 'resolved';
    target.resolvedAt = new Date().toISOString();
    target.resolvedById = access.userId;
    if (reply) target.reply = reply;

    await this.repo.update(id, { flags: existingFlags });

    await this.audit.record({
      actorId: access.userId,
      action: 'report.flag_resolved',
      resourceType: 'report',
      resourceId: id,
      after: { flagId, reply },
    });

    const withRelations = await this.repo.findById(id, { queries: true, club: true });
    if (!withRelations) throw new NotFoundException();
    return withRelations;
  }

  async getAuditHistory(access: ResolvedAccess, id: string) {
    const report = await this.repo.findById(id);
    if (!report) throw new NotFoundException();
    await this.scope.assertCanAccessClubAny(
      access,
      [...READ_PERMISSIONS, 'reports:manage'],
      report.clubId,
    );
    return this.repo.findAuditLogs(id);
  }
}
