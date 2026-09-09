import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ScopeType } from '@prisma/client';
import { CodedConflictException } from '../common/errors/conflict.error';
import { PrismaService } from '../prisma/prisma.service';

export type UserRoleGrant = {
  roleKey: string;
  scopeType: ScopeType;
  scopeId: string | null;
  permissionKeys: string[];
};

export type RoleRecord = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  scopeType: ScopeType;
  permissionKeys: string[];
};

export type UserRoleRecord = {
  id: string;
  userId: string;
  roleId: string;
  roleKey: string;
  scopeType: ScopeType;
  scopeId: string | null;
  grantedById: string | null;
  createdAt: Date;
};

const roleInclude = { permissions: { include: { permission: true } } } satisfies Prisma.RoleInclude;
type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

const toRole = (r: RoleWithPermissions): RoleRecord => ({
  id: r.id,
  key: r.key,
  name: r.name,
  description: r.description,
  isSystem: r.isSystem,
  scopeType: r.scopeType,
  permissionKeys: r.permissions.map((p) => p.permission.key).sort(),
});

@Injectable()
export class RbacRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findGrantsForUser(userId: string): Promise<UserRoleGrant[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: roleInclude } },
    });
    return rows.map((ur) => ({
      roleKey: ur.role.key,
      scopeType: ur.scopeType,
      scopeId: ur.scopeId,
      permissionKeys: ur.role.permissions.map((p) => p.permission.key),
    }));
  }

  async listPermissions(): Promise<{ key: string; description: string }[]> {
    return this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      select: { key: true, description: true },
    });
  }

  async listRoles(): Promise<RoleRecord[]> {
    const rows = await this.prisma.role.findMany({ include: roleInclude, orderBy: { key: 'asc' } });
    return rows.map(toRole);
  }

  async findRole(id: string): Promise<RoleRecord | null> {
    const row = await this.prisma.role.findUnique({ where: { id }, include: roleInclude });
    return row ? toRole(row) : null;
  }

  async findRoleByKey(key: string): Promise<RoleRecord | null> {
    const row = await this.prisma.role.findUnique({ where: { key }, include: roleInclude });
    return row ? toRole(row) : null;
  }

  async permissionIdsByKeys(keys: string[]): Promise<Map<string, string>> {
    const rows = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    return new Map(rows.map((p) => [p.key, p.id]));
  }

  async createRole(
    data: { key: string; name: string; description?: string; scopeType: ScopeType },
    permissionIds: string[],
  ): Promise<RoleRecord> {
    const row = await this.prisma.role.create({
      data: {
        ...data,
        permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
      },
      include: roleInclude,
    });
    return toRole(row);
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string | null; scopeType?: ScopeType },
    permissionIds?: string[],
  ): Promise<RoleRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
      return tx.role.update({ where: { id }, data, include: roleInclude });
    });
    return toRole(row);
  }

  async deleteRole(id: string): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }

  async countUserRolesByRole(roleId: string): Promise<number> {
    return this.prisma.userRole.count({ where: { roleId } });
  }

  async listUserRoles(userId?: string): Promise<UserRoleRecord[]> {
    const rows = await this.prisma.userRole.findMany({
      where: userId ? { userId } : {},
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ ...r, roleKey: r.role.key }));
  }

  async findUserRole(id: string): Promise<UserRoleRecord | null> {
    const r = await this.prisma.userRole.findUnique({ where: { id }, include: { role: true } });
    return r ? { ...r, roleKey: r.role.key } : null;
  }

  async findExistingUserRole(
    userId: string,
    roleId: string,
    scopeType: ScopeType,
    scopeId: string | null,
  ): Promise<UserRoleRecord | null> {
    const r = await this.prisma.userRole.findFirst({
      where: { userId, roleId, scopeType, scopeId },
      include: { role: true },
    });
    return r ? { ...r, roleKey: r.role.key } : null;
  }

  async createUserRole(data: {
    userId: string;
    roleId: string;
    scopeType: ScopeType;
    scopeId: string | null;
    grantedById: string;
  }): Promise<UserRoleRecord> {
    const r = await this.prisma.userRole.create({ data, include: { role: true } });
    return { ...r, roleKey: r.role.key };
  }

  async deleteUserRole(id: string): Promise<void> {
    await this.prisma.userRole.delete({ where: { id } });
  }

  async userExists(userId: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { id: userId } })) > 0;
  }

  async scopeExists(scopeType: ScopeType, scopeId: string): Promise<boolean> {
    if (scopeType === 'club') return (await this.prisma.club.count({ where: { id: scopeId } })) > 0;
    if (scopeType === 'zone') return (await this.prisma.zone.count({ where: { id: scopeId } })) > 0;
    return true;
  }

  async listUsersDirectory(q?: string) {
    const filter = q?.trim();
    const users = await this.prisma.user.findMany({
      where: filter
        ? {
            OR: [
              { name: { contains: filter, mode: 'insensitive' } },
              { email: { contains: filter, mode: 'insensitive' } },
              { profile: { fullName: { contains: filter, mode: 'insensitive' } } },
            ],
          }
        : {},
      include: {
        profile: {
          include: {
            club: { select: { id: true, name: true, shortName: true } },
          },
        },
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      profile: u.profile
        ? {
            id: u.profile.id,
            fullName: u.profile.fullName,
            status: u.profile.status,
            clubId: u.profile.clubId,
            clubName: u.profile.club.name,
            clubShortName: u.profile.club.shortName,
            phone: u.profile.phone,
            rotaryId: u.profile.rotaryId,
            photoUrl: u.profile.photoUrl,
          }
        : null,
      roles: u.userRoles.map((ur) => ({
        id: ur.id,
        roleId: ur.roleId,
        roleKey: ur.role.key,
        roleName: ur.role.name,
        scopeType: ur.scopeType,
        scopeId: ur.scopeId,
        grantedById: ur.grantedById,
        permissions: ur.role.permissions.map((rp) => rp.permission.key),
      })),
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async createUserWithAccountAndRole(data: {
    name: string;
    email: string;
    passwordHash: string;
    clubId: string;
    phone?: string;
    roleKey: string;
    grantedById: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: data.email } });
      if (existing) {
        throw new CodedConflictException('EMAIL_EXISTS', `An account with email "${data.email}" already exists.`);
      }

      const role = await tx.role.findUnique({ where: { key: data.roleKey } });
      if (!role) {
        throw new NotFoundException(`Role with key "${data.roleKey}" not found.`);
      }

      const userId = randomUUID();
      const user = await tx.user.create({
        data: {
          id: userId,
          name: data.name,
          email: data.email,
          emailVerified: true,
        },
      });

      await tx.account.create({
        data: {
          id: randomUUID(),
          accountId: userId,
          providerId: 'credential',
          issuer: 'local:credential',
          userId,
          password: data.passwordHash,
        },
      });

      const qrToken = 'c' + randomUUID().replace(/-/g, '').slice(0, 24);
      const isDac = data.clubId === 'DISTRICT' || role.scopeType === 'none';

      const profile = await tx.memberProfile.create({
        data: {
          id: 'c' + randomUUID().replace(/-/g, '').slice(0, 24),
          userId,
          fullName: data.name,
          email: data.email,
          phone: data.phone || null,
          clubId: data.clubId,
          status: 'approved',
          qrToken,
          directoryOptIn: true,
          isDacMember: isDac,
          themePreference: 'system',
        },
      });

      const scopeId = role.scopeType === 'club' ? data.clubId : null;
      const userRole = await tx.userRole.create({
        data: {
          id: 'c' + randomUUID().replace(/-/g, '').slice(0, 24),
          userId,
          roleId: role.id,
          scopeType: role.scopeType,
          scopeId,
          grantedById: data.grantedById,
        },
      });

      return { user, profile, userRole };
    });
  }
}
