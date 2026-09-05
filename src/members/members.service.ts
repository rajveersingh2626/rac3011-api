import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { NotificationPort } from '../notifications/notification.port';
import { ScopeService } from '../common/scope/scope.service';
import { CodedConflictException } from '../common/errors/conflict.error';
import type { ResolvedAccess } from '../common/types/access';
import { hashPassword } from '../auth/legacy-password';
import type { RegisterMemberInput } from './dto/register-member.dto';
import type { UpdateMemberInput } from './dto/update-member.dto';
import { MembersRepository } from './members.repository';
import { MEMBER_APPROVED_EVENT } from './members.events';
import type { MemberListFilter, MemberRow } from './members.types';

const READ_PERMISSIONS = ['members:view', 'members:approve'] as const;

@Injectable()
export class MembersService {
  constructor(
    private readonly repo: MembersRepository,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationPort,
    private readonly events: EventEmitter2,
  ) {}

  async register(input: RegisterMemberInput): Promise<MemberRow> {
    if (!(await this.repo.clubExists(input.clubId))) {
      throw new BadRequestException('Unknown club');
    }
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new CodedConflictException(
        'ALREADY_EXISTS',
        'An account already exists for this email',
      );
    }
    const member = await this.repo.createMember({
      fullName: input.fullName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      clubId: input.clubId,
      phone: input.phone ?? null,
      rotaryId: input.rotaryId ?? null,
      status: 'pending',
    });
    const officerUserIds = await this.repo.findClubOfficerUserIds(input.clubId);
    if (officerUserIds.length > 0) {
      await this.notifications.notify({
        template: 'member-registered',
        to: officerUserIds.map((userId) => ({ userId })),
        data: { memberId: member.id, fullName: member.fullName, email: member.email },
      });
    }
    return member;
  }

  async list(
    access: ResolvedAccess,
    filter: MemberListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: MemberRow[]; total: number }> {
    const scope = await this.scope.clubFilterAny(access, [...READ_PERMISSIONS]);
    const narrowed = ScopeService.narrowClubs(scope, filter.clubId);
    if ('clubIds' in narrowed && narrowed.clubIds.length === 0) return { items: [], total: 0 };
    return this.repo.findMany(filter, narrowed, page, pageSize);
  }

  async get(access: ResolvedAccess, id: string): Promise<MemberRow> {
    const member = await this.repo.findById(id);
    if (!member) throw new NotFoundException();
    await this.scope.assertCanAccessClubAny(access, [...READ_PERMISSIONS], member.clubId);
    return member;
  }

  async updateStatus(
    access: ResolvedAccess,
    id: string,
    input: UpdateMemberInput,
  ): Promise<MemberRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    await this.scope.assertCanAccessClub(access, 'members:approve', existing.clubId);

    if (existing.status === input.status) {
      throw new CodedConflictException('INVALID_TRANSITION', `Member is already ${input.status}`);
    }
    if (existing.status === 'pending' && input.status === 'suspended' && !input.rejectionReason) {
      throw new BadRequestException('A reason is required when declining a new registration');
    }

    const updated = await this.repo.updateStatus(
      id,
      existing.userId,
      access.userId,
      existing.clubId,
      {
        status: input.status,
        rejectionReason: input.rejectionReason ?? null,
      },
    );

    await this.audit.record({
      actorId: access.userId,
      action: `member.${input.status === 'approved' ? 'approved' : 'suspended'}`,
      resourceType: 'member_profile',
      resourceId: id,
      before: { status: existing.status },
      after: { status: updated.status, rejectionReason: updated.rejectionReason },
    });

    if (updated.status === 'approved') {
      this.events.emit(MEMBER_APPROVED_EVENT, {
        memberId: updated.id,
        userId: updated.userId,
        clubId: updated.clubId,
        approvedById: access.userId,
        approvedAt: updated.approvedAt?.toISOString() ?? new Date().toISOString(),
      });
      await this.notifications.notify({
        template: 'member-approved',
        to: [{ userId: updated.userId }],
        data: { memberId: updated.id },
      });
    } else {
      await this.notifications.notify({
        template: 'member-rejected',
        to: [{ userId: updated.userId }],
        data: { memberId: updated.id, rejectionReason: updated.rejectionReason },
      });
    }

    return updated;
  }
}
