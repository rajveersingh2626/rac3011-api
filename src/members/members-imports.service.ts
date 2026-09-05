import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { NotificationPort } from '../notifications/notification.port';
import { ScopeService } from '../common/scope/scope.service';
import { hashPassword } from '../auth/legacy-password';
import type { ResolvedAccess } from '../common/types/access';
import { parseCsv } from './csv.util';
import type { ImportRowInput } from './dto/import-members.dto';
import { MembersRepository } from './members.repository';
import type { ImportCommitResult, ImportPreviewResult, ImportPreviewRow } from './members.types';

const emailSchema = z.string().trim().toLowerCase().email();

function pick(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return '';
}

function toRowInput(row: Record<string, string>): {
  fullName: string;
  email: string;
  phone: string;
  rotaryId: string;
} {
  return {
    fullName: pick(row, ['fullname', 'full name', 'name']),
    email: pick(row, ['email', 'e-mail']),
    phone: pick(row, ['phone', 'phone number', 'mobile']),
    rotaryId: pick(row, ['rotaryid', 'rotary id']),
  };
}

@Injectable()
export class MembersImportsService {
  constructor(
    private readonly repo: MembersRepository,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationPort,
  ) {}

  async preview(access: ResolvedAccess, clubId: string, csv: string): Promise<ImportPreviewResult> {
    await this.scope.assertCanAccessClub(access, 'members:import', clubId);
    const parsed = parseCsv(csv);
    const seenInFile = new Set<string>();
    const emails = parsed
      .map((row) => toRowInput(row).email.toLowerCase())
      .filter((email) => emailSchema.safeParse(email).success);
    const existing = await this.repo.findExistingEmails(emails);

    const rows: ImportPreviewRow[] = parsed.map((raw, index) => {
      const input = toRowInput(raw);
      const errors: string[] = [];
      if (!input.fullName) errors.push('Name is required');
      const emailResult = emailSchema.safeParse(input.email);
      if (!emailResult.success) errors.push('A valid email is required');
      const email = emailResult.success ? emailResult.data : input.email.toLowerCase();

      let outcome: ImportPreviewRow['outcome'] = 'new';
      if (errors.length > 0) outcome = 'invalid';
      else if (existing.has(email) || seenInFile.has(email)) outcome = 'duplicate';
      seenInFile.add(email);

      return {
        lineNumber: index + 2,
        fullName: input.fullName,
        email,
        phone: input.phone || null,
        rotaryId: input.rotaryId || null,
        outcome,
        errors,
      };
    });

    return {
      id: randomUUID(),
      clubId,
      rows,
      summary: {
        total: rows.length,
        new: rows.filter((r) => r.outcome === 'new').length,
        duplicate: rows.filter((r) => r.outcome === 'duplicate').length,
        invalid: rows.filter((r) => r.outcome === 'invalid').length,
      },
    };
  }

  async commit(
    access: ResolvedAccess,
    id: string,
    clubId: string,
    rows: ImportRowInput[],
  ): Promise<ImportCommitResult> {
    await this.scope.assertCanAccessClub(access, 'members:import', clubId);
    const existing = await this.repo.findExistingEmails(rows.map((r) => r.email));

    const memberIds: string[] = [];
    let skipped = 0;
    for (const row of rows) {
      const email = row.email.toLowerCase();
      if (existing.has(email)) {
        skipped += 1;
        continue;
      }
      existing.add(email);
      const member = await this.repo.createMember({
        fullName: row.fullName,
        email,
        passwordHash: await hashPassword(randomBytes(24).toString('hex')),
        clubId,
        phone: row.phone ?? null,
        rotaryId: row.rotaryId ?? null,
        status: 'approved',
      });
      memberIds.push(member.id);
      await this.notifications.notify({
        template: 'password-reset-required',
        to: [{ email }],
        data: { memberId: member.id, fullName: member.fullName },
      });
    }

    await this.audit.record({
      actorId: access.userId,
      action: 'member.imported',
      resourceType: 'member_profile',
      resourceId: id,
      after: { clubId, committed: memberIds.length, skipped },
    });

    return { id, clubId, committed: memberIds.length, skipped, memberIds };
  }
}
