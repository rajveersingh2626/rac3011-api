import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubScopeFilter } from '../common/scope/scope.service';
import type {
  MemberListFilter,
  MemberRow,
  MemberStatus,
  MemberStatusUpdate,
} from './members.types';

const MEMBER_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  email: true,
  phone: true,
  rotaryId: true,
  clubId: true,
  photoUrl: true,
  bio: true,
  skills: true,
  interests: true,
  membershipAnniversary: true,
  status: true,
  approvedById: true,
  approvedAt: true,
  rejectionReason: true,
  directoryOptIn: true,
  isDacMember: true,
  createdAt: true,
  club: { select: { id: true, name: true, shortName: true } },
} satisfies Prisma.MemberProfileSelect;

const MEMBER_ROLE_KEY = 'member';

export type NewMemberInput = {
  fullName: string;
  email: string;
  passwordHash: string;
  clubId: string;
  phone: string | null;
  rotaryId: string | null;
  status: MemberStatus;
};

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private whereFor(
    filter: MemberListFilter,
    scope: ClubScopeFilter,
  ): Prisma.MemberProfileWhereInput {
    const scopeWhere: Prisma.MemberProfileWhereInput =
      'all' in scope ? {} : { clubId: { in: scope.clubIds } };
    return {
      ...scopeWhere,
      status: filter.status,
      clubId: filter.clubId ?? scopeWhere.clubId,
      OR: filter.q
        ? [
            { fullName: { contains: filter.q, mode: 'insensitive' } },
            { email: { contains: filter.q, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }

  async findMany(
    filter: MemberListFilter,
    scope: ClubScopeFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: MemberRow[]; total: number }> {
    const where = this.whereFor(filter, scope);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.memberProfile.findMany({
        where,
        select: MEMBER_SELECT,
        orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.memberProfile.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<MemberRow | null> {
    return this.prisma.memberProfile.findUnique({ where: { id }, select: MEMBER_SELECT });
  }

  async findByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.memberProfile.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
  }

  async findExistingEmails(emails: string[]): Promise<Set<string>> {
    if (emails.length === 0) return new Set();
    const rows = await this.prisma.memberProfile.findMany({
      where: { email: { in: emails.map((e) => e.toLowerCase()) } },
      select: { email: true },
    });
    return new Set(rows.map((r) => r.email.toLowerCase()));
  }

  async clubExists(clubId: string): Promise<boolean> {
    return (await this.prisma.club.count({ where: { id: clubId } })) > 0;
  }

  async findClubOfficerUserIds(clubId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: {
        scopeType: 'club',
        scopeId: clubId,
        role: { key: { in: ['president', 'secretary'] } },
      },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  async createMember(input: NewMemberInput): Promise<MemberRow> {
    const userId = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: { id: userId, name: input.fullName, email: input.email, emailVerified: true },
      });
      await tx.account.create({
        data: {
          id: randomUUID(),
          userId,
          accountId: userId,
          providerId: 'credential',
          issuer: 'local:credential',
          password: input.passwordHash,
        },
      });
      await tx.memberProfile.create({
        data: {
          userId,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          rotaryId: input.rotaryId,
          clubId: input.clubId,
          status: input.status,
        },
      });
      if (input.status === 'approved') await this.grantMemberRole(tx, userId, input.clubId);
    });
    const created = await this.prisma.memberProfile.findUnique({
      where: { userId },
      select: MEMBER_SELECT,
    });
    if (!created) throw new Error('Member row disappeared immediately after creation');
    return created;
  }

  private async grantMemberRole(
    tx: Prisma.TransactionClient,
    userId: string,
    clubId: string,
  ): Promise<void> {
    const role = await tx.role.findUniqueOrThrow({ where: { key: MEMBER_ROLE_KEY } });
    const existing = await tx.userRole.findFirst({
      where: { userId, roleId: role.id, scopeType: 'club', scopeId: clubId },
    });
    if (!existing) {
      await tx.userRole.create({
        data: { userId, roleId: role.id, scopeType: 'club', scopeId: clubId },
      });
    }
  }

  private async revokeMemberRole(
    tx: Prisma.TransactionClient,
    userId: string,
    clubId: string,
  ): Promise<void> {
    const role = await tx.role.findUnique({ where: { key: MEMBER_ROLE_KEY } });
    if (!role) return;
    await tx.userRole.deleteMany({
      where: { userId, roleId: role.id, scopeType: 'club', scopeId: clubId },
    });
  }

  async updateStatus(
    id: string,
    memberUserId: string,
    actorUserId: string,
    clubId: string,
    update: MemberStatusUpdate,
  ): Promise<MemberRow> {
    await this.prisma.$transaction(async (tx) => {
      await tx.memberProfile.update({
        where: { id },
        data: {
          status: update.status,
          rejectionReason: update.status === 'suspended' ? (update.rejectionReason ?? null) : null,
          approvedById: update.status === 'approved' ? actorUserId : undefined,
          approvedAt: update.status === 'approved' ? new Date() : undefined,
        },
      });
      if (update.status === 'approved') await this.grantMemberRole(tx, memberUserId, clubId);
      else await this.revokeMemberRole(tx, memberUserId, clubId);
    });
    const updated = await this.prisma.memberProfile.findUnique({
      where: { id },
      select: MEMBER_SELECT,
    });
    if (!updated) throw new Error('Member row disappeared during status update');
    return updated;
  }
}
