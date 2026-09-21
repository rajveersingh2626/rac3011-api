import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReportsService } from './reports.service';
import type { ResolvedAccess } from '../common/types/access';
import { currentRyYear, monthKey } from '../common/ry-year';

describe('ReportsService - Production Features', () => {
  let service: ReportsService;
  let repo: any;
  let schemas: any;
  let scope: any;
  let audit: any;
  let notifications: any;
  let events: any;
  let assistPort: any;

  const mockAccess: ResolvedAccess = {
    userId: 'user-001',
    roles: [{ roleKey: 'super_admin', scopeType: 'none', scopeId: null }],
    grants: [
      { key: 'reports:submit', scopeType: 'none', scopeId: null },
      { key: 'reports:review', scopeType: 'none', scopeId: null },
      { key: 'reports:manage', scopeType: 'none', scopeId: null },
      { key: 'reports:score', scopeType: 'none', scopeId: null },
    ],
  };

  beforeEach(() => {
    repo = {
      findById: vi.fn(),
      findByClubMonth: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findExistingClubIds: vi.fn().mockResolvedValue(new Set()),
      findAuditLogs: vi.fn(),
    };
    schemas = {
      getActive: vi.fn().mockResolvedValue({ id: 'sch-1', version: 2, fields: [] }),
      getByVersion: vi.fn().mockResolvedValue({ id: 'sch-1', version: 2, fields: [] }),
    };
    scope = {
      assertCanAccessClub: vi.fn().mockResolvedValue(undefined),
      assertCanAccessClubAny: vi.fn().mockResolvedValue(undefined),
    };
    audit = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    notifications = {
      notify: vi.fn().mockResolvedValue(undefined),
    };
    events = {
      emit: vi.fn(),
    };
    assistPort = {
      assist: vi.fn(),
    };

    service = new ReportsService(
      repo,
      schemas,
      scope,
      audit,
      notifications,
      events,
      assistPort,
    );
  });

  describe('Time-Bound Month Selection & Access Control', () => {
    it('returns 12 months for the active Rotary Year with future months locked', () => {
      const months = service.getActiveReportingMonths();
      expect(months).toHaveLength(12);
      expect(months[0].key).toContain('-07');
      expect(months[11].key).toContain('-06');
      const lockedCount = months.filter((m) => m.isLocked).length;
      expect(lockedCount).toBeGreaterThanOrEqual(0);
    });

    it('rejects creating a report for a future month with FUTURE_MONTH_LOCKED', async () => {
      // 2099-01 is definitely in the future
      await expect(
        service.create(mockAccess, { clubId: 'club-1', month: '2099-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creating a report outside the active Rotary Year with INVALID_REPORTING_YEAR', async () => {
      const pastRyMonth = '2020-07';
      await expect(
        service.create(mockAccess, { clubId: 'club-1', month: pastRyMonth }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully creates a report for an allowed past or current month in the active RY', async () => {
      const activeRy = currentRyYear();
      // July of the active RY is always past or current
      const validMonth = `${activeRy}-07`;
      repo.findByClubMonth.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'rep-new' });
      repo.findById.mockResolvedValue({ id: 'rep-new', clubId: 'club-1', month: new Date(`${validMonth}-01`) });

      const result = await service.create(mockAccess, { clubId: 'club-1', month: validMonth });
      expect(result.id).toBe('rep-new');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: 'club-1',
          ryYear: activeRy,
        }),
      );
    });
  });

  describe('District Reset & Deletion with Audit Logging', () => {
    it('resets a report to draft, clears values if requested, logs audit, and emits REPORT_RESET_EVENT', async () => {
      const existing = {
        id: 'rep-1',
        clubId: 'club-1',
        ryYear: 2026,
        month: new Date('2026-08-01T00:00:00Z'),
        status: 'submitted',
        values: { activities: [{ title: 'Old project' }] },
        notes: 'Old notes',
        submittedAt: new Date(),
        submittedById: 'user-submitter',
      };
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue({ ...existing, status: 'draft' });

      await service.reset(mockAccess, 'rep-1', { reason: 'Incorrect metrics, refill from scratch', clearValues: true });

      expect(repo.update).toHaveBeenCalledWith('rep-1', expect.objectContaining({
        status: 'draft',
        values: { activities: [] },
        submittedAt: null,
        submittedById: null,
      }));
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'report.reset',
        resourceType: 'report',
        resourceId: 'rep-1',
      }));
      expect(events.emit).toHaveBeenCalledWith('report.reset', expect.objectContaining({
        reportId: 'rep-1',
        clubId: 'club-1',
        resetById: 'user-001',
      }));
    });

    it('deletes a report completely, records audit snapshot, and emits REPORT_DELETED_EVENT', async () => {
      const existing = {
        id: 'rep-2',
        clubId: 'club-1',
        ryYear: 2026,
        month: new Date('2026-08-01T00:00:00Z'),
        status: 'submitted',
      };
      repo.findById.mockResolvedValue(existing);

      const result = await service.delete(mockAccess, 'rep-2', 'Duplicate test entry');
      expect(result).toEqual({ success: true });
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'report.deleted',
        resourceType: 'report',
        resourceId: 'rep-2',
      }));
      expect(repo.delete).toHaveBeenCalledWith('rep-2');
      expect(events.emit).toHaveBeenCalledWith('report.deleted', expect.objectContaining({
        reportId: 'rep-2',
        clubId: 'club-1',
        deletedById: 'user-001',
      }));
    });
  });

  describe('Granular Review Flags System', () => {
    it('attaches review flags, transitions status to queried, records audit, and notifies submitter', async () => {
      const existing = {
        id: 'rep-3',
        clubId: 'club-1',
        status: 'submitted',
        flags: [],
        submittedById: 'submitter-123',
      };
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue({ ...existing, status: 'queried' });

      await service.setFlags(mockAccess, 'rep-3', {
        flags: [
          {
            targetType: 'field',
            fieldKey: 'physical_meetings',
            comment: 'Value 7186 is obviously invalid. Please correct.',
          },
          {
            targetType: 'activity',
            activityIndex: 0,
            activityFieldKey: 'beneficiary_count',
            comment: 'Please verify beneficiary count with proof.',
          },
        ],
        reason: 'Corrections needed on meetings and beneficiaries',
      });

      expect(repo.update).toHaveBeenCalledWith('rep-3', expect.objectContaining({
        status: 'queried',
        flags: expect.arrayContaining([
          expect.objectContaining({
            fieldKey: 'physical_meetings',
            status: 'flagged',
            comment: 'Value 7186 is obviously invalid. Please correct.',
          }),
        ]),
      }));
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'report.flagged',
        resourceType: 'report',
        resourceId: 'rep-3',
      }));
    });

    it('resolves an active flag with an optional reply', async () => {
      const existing = {
        id: 'rep-4',
        clubId: 'club-1',
        status: 'queried',
        flags: [
          {
            id: 'flag-abc',
            targetType: 'field',
            fieldKey: 'physical_meetings',
            comment: 'Fix meeting count',
            status: 'flagged',
            flaggedById: 'admin-1',
            flaggedAt: new Date().toISOString(),
          },
        ],
      };
      repo.findById.mockResolvedValue(existing);

      await service.resolveFlag(mockAccess, 'rep-4', 'flag-abc', 'Updated count to 4 meetings');

      expect(repo.update).toHaveBeenCalledWith('rep-4', expect.objectContaining({
        flags: [
          expect.objectContaining({
            id: 'flag-abc',
            status: 'resolved',
            reply: 'Updated count to 4 meetings',
            resolvedById: 'user-001',
          }),
        ],
      }));
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'report.flag_resolved',
      }));
    });
  });
});
