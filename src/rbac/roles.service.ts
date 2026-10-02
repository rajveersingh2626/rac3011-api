import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { hashPassword } from '../auth/legacy-password';
import { env } from '../config/env';
import { AuditService } from '../audit/audit.service';
import { CodedConflictException } from '../common/errors/conflict.error';
import type { ScopeKind } from '../common/types/access';
import { isPermissionKey } from '../common/types/permission-keys';
import { EmailProviderPool } from '../notifications/email/email-provider-pool.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleInput, UpdateRoleInput } from './dto/role.dto';
import { CreateUserRoleInput } from './dto/user-role.dto';
import { CreateAdminUserInput } from './dto/create-admin-user.dto';
import { UpdateAdminUserInput } from './dto/update-admin-user.dto';
import { RbacRepository, RoleRecord, UserRoleRecord } from './rbac.repository';

@Injectable()
export class RolesService {
  constructor(
    private readonly repo: RbacRepository,
    private readonly audit: AuditService,
    @Optional() private readonly emailPool?: EmailProviderPool,
    @Optional() private readonly prisma?: PrismaService,
  ) { }

  listRoles(): Promise<RoleRecord[]> {
    return this.repo.listRoles();
  }

  listPermissions(): Promise<{ key: string; description: string }[]> {
    return this.repo.listPermissions();
  }

  async getRole(id: string): Promise<RoleRecord> {
    const role = await this.repo.findRole(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  getRoleByKey(key: string): Promise<RoleRecord | null> {
    return this.repo.findRoleByKey(key);
  }

  findExistingGrant(
    userId: string,
    roleId: string,
    scopeType: ScopeKind,
    scopeId: string | null,
  ): Promise<UserRoleRecord | null> {
    return this.repo.findExistingUserRole(userId, roleId, scopeType, scopeId);
  }

  async createRole(actorId: string, input: CreateRoleInput): Promise<RoleRecord> {
    const existing = await this.repo.findRoleByKey(input.key);
    if (existing) throw new CodedConflictException('ALREADY_EXISTS', 'A role with this key exists');
    const permissionIds = await this.resolvePermissionIds(input.permissionKeys);
    const role = await this.repo.createRole(
      {
        key: input.key,
        name: input.name,
        description: input.description,
        scopeType: input.scopeType,
      },
      permissionIds,
    );
    await this.audit.record({
      actorId,
      action: 'role.created',
      resourceType: 'role',
      resourceId: role.id,
      after: {
        id: role.id,
        key: role.key,
        scopeType: role.scopeType,
        permissionKeys: role.permissionKeys,
      },
    });
    return role;
  }

  async updateRole(actorId: string, id: string, input: UpdateRoleInput): Promise<RoleRecord> {
    const before = await this.getRole(id);
    const permissionIds = input.permissionKeys
      ? await this.resolvePermissionIds(input.permissionKeys)
      : undefined;
    const updated = await this.repo.updateRole(
      id,
      { name: input.name, description: input.description, scopeType: input.scopeType },
      permissionIds,
    );
    await this.audit.record({
      actorId,
      action: 'role.updated',
      resourceType: 'role',
      resourceId: id,
      before: this.roleAuditFields(before, input),
      after: this.roleAuditFields(updated, input),
    });
    return updated;
  }

  async deleteRole(actorId: string, id: string): Promise<void> {
    const role = await this.getRole(id);
    if (role.isSystem) {
      throw new CodedConflictException('INVALID_TRANSITION', 'System roles cannot be deleted');
    }
    const grants = await this.repo.countUserRolesByRole(id);
    if (grants > 0) {
      throw new CodedConflictException(
        'INVALID_TRANSITION',
        'Revoke all grants of this role before deleting it',
      );
    }
    await this.repo.deleteRole(id);
    await this.audit.record({
      actorId,
      action: 'role.deleted',
      resourceType: 'role',
      resourceId: id,
      before: {
        id: role.id,
        key: role.key,
        scopeType: role.scopeType,
        permissionKeys: role.permissionKeys,
      },
    });
  }

  listUserRoles(userId?: string): Promise<UserRoleRecord[]> {
    return this.repo.listUserRoles(userId);
  }

  listUsersDirectory(q?: string) {
    return this.repo.listUsersDirectory(q);
  }

  async grantUserRole(actorId: string, input: CreateUserRoleInput): Promise<UserRoleRecord> {
    if (!(await this.repo.userExists(input.userId))) throw new NotFoundException('User not found');
    const role = await this.repo.findRole(input.roleId);
    if (!role) throw new NotFoundException('Role not found');
    if (role.scopeType !== input.scopeType) {
      throw new BadRequestException(
        `Role "${role.key}" must be granted with scope ${role.scopeType}`,
      );
    }
    const scopeId = await this.resolveScopeId(input.scopeType, input.scopeId);
    const existing = await this.repo.findExistingUserRole(
      input.userId,
      input.roleId,
      input.scopeType,
      scopeId,
    );
    if (existing) throw new CodedConflictException('ALREADY_EXISTS', 'This grant already exists');
    const grant = await this.repo.createUserRole({
      userId: input.userId,
      roleId: input.roleId,
      scopeType: input.scopeType,
      scopeId,
      grantedById: actorId,
    });
    await this.audit.record({
      actorId,
      action: 'user_role.granted',
      resourceType: 'user_role',
      resourceId: grant.id,
      after: {
        id: grant.id,
        userId: grant.userId,
        roleId: grant.roleId,
        scopeType: grant.scopeType,
        scopeId: grant.scopeId,
      },
    });

    // Role & Club Affiliation Sync:
    if (this.prisma && input.scopeType === 'club' && scopeId) {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        include: { profile: true },
      });
      if (user) {
        if (user.profile) {
          await this.prisma.memberProfile.update({
            where: { id: user.profile.id },
            data: { clubId: scopeId, status: 'approved' },
          });
        } else {
          await this.prisma.memberProfile.create({
            data: {
              userId: user.id,
              fullName: user.name,
              email: user.email,
              clubId: scopeId,
              status: 'approved',
            },
          });
        }

        const ryYear = 2026;
        if (role.key === 'president') {
          await this.prisma.club.update({
            where: { id: scopeId },
            data: {
              president: user.name,
              email: user.email,
              phone: user.profile?.phone ?? undefined,
            },
          }).catch(() => {});

          const existingBoard = await this.prisma.clubBoardMember.findFirst({
            where: { clubId: scopeId, ryYear, position: { equals: 'President', mode: 'insensitive' } },
          });
          if (existingBoard) {
            await this.prisma.clubBoardMember.update({
              where: { id: existingBoard.id },
              data: { name: user.name, email: user.email, phone: user.profile?.phone ?? null, memberId: user.profile?.id ?? null },
            });
          } else {
            await this.prisma.clubBoardMember.create({
              data: {
                clubId: scopeId,
                name: user.name,
                position: 'President',
                email: user.email,
                phone: user.profile?.phone ?? null,
                memberId: user.profile?.id ?? null,
                ryYear,
                order: 0,
              },
            });
          }
        } else if (role.key === 'secretary') {
          await this.prisma.club.update({
            where: { id: scopeId },
            data: {
              secretary: user.name,
              secretaryEmail: user.email,
              secretaryPhone: user.profile?.phone ?? undefined,
            },
          }).catch(() => {});

          const existingBoard = await this.prisma.clubBoardMember.findFirst({
            where: { clubId: scopeId, ryYear, position: { equals: 'Secretary', mode: 'insensitive' } },
          });
          if (existingBoard) {
            await this.prisma.clubBoardMember.update({
              where: { id: existingBoard.id },
              data: { name: user.name, email: user.email, phone: user.profile?.phone ?? null, memberId: user.profile?.id ?? null },
            });
          } else {
            await this.prisma.clubBoardMember.create({
              data: {
                clubId: scopeId,
                name: user.name,
                position: 'Secretary',
                email: user.email,
                phone: user.profile?.phone ?? null,
                memberId: user.profile?.id ?? null,
                ryYear,
                order: 1,
              },
            });
          }
        }
      }
    }

    // Send in-portal notification and email notification
    await this.notifyAccessGranted(actorId, input.userId, role.name, input.scopeType, scopeId);

    return grant;
  }

  async revokeUserRole(actorId: string, id: string): Promise<void> {
    const grant = await this.repo.findUserRole(id);
    if (!grant) throw new NotFoundException('Grant not found');

    if (this.prisma && grant.scopeType === 'club' && grant.scopeId) {
      const role = await this.repo.findRole(grant.roleId);
      const user = await this.prisma.user.findUnique({
        where: { id: grant.userId },
        include: { profile: true },
      });
      if (user && role) {
        const ryYear = 2026;
        if (role.key === 'president') {
          await this.prisma.clubBoardMember.deleteMany({
            where: {
              clubId: grant.scopeId,
              ryYear,
              position: { equals: 'President', mode: 'insensitive' },
              OR: [{ name: user.name }, { email: user.email }, { memberId: user.profile?.id ?? undefined }],
            },
          }).catch(() => {});
          await this.prisma.club.updateMany({
            where: { id: grant.scopeId, president: user.name },
            data: { president: null },
          }).catch(() => {});
        } else if (role.key === 'secretary') {
          await this.prisma.clubBoardMember.deleteMany({
            where: {
              clubId: grant.scopeId,
              ryYear,
              position: { equals: 'Secretary', mode: 'insensitive' },
              OR: [{ name: user.name }, { email: user.email }, { memberId: user.profile?.id ?? undefined }],
            },
          }).catch(() => {});
          await this.prisma.club.updateMany({
            where: { id: grant.scopeId, secretary: user.name },
            data: { secretary: null, secretaryEmail: null, secretaryPhone: null },
          }).catch(() => {});
        }
      }
    }

    await this.repo.deleteUserRole(id);
    await this.audit.record({
      actorId,
      action: 'user_role.revoked',
      resourceType: 'user_role',
      resourceId: id,
      before: {
        id: grant.id,
        userId: grant.userId,
        roleId: grant.roleId,
        scopeType: grant.scopeType,
        scopeId: grant.scopeId,
      },
    });
  }

  async createUser(actorId: string, input: CreateAdminUserInput) {
    const passwordHash = await hashPassword(input.password || 'Rac3011#2026');
    const result = await this.repo.createUserWithAccountAndRole({
      name: input.name,
      email: input.email,
      passwordHash,
      clubId: input.clubId,
      phone: input.phone,
      roleKey: input.roleKey,
      grantedById: actorId,
      scopeId: input.scopeId,
    });

    await this.audit.record({
      actorId,
      action: 'user.created',
      resourceType: 'user',
      resourceId: result.user.id,
      after: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        roleKey: input.roleKey,
        clubId: input.clubId,
      },
    });

    // Notify user of their new account and role
    const role = await this.repo.findRoleByKey(input.roleKey);
    if (role) {
      await this.notifyAccessGranted(
        actorId,
        result.user.id,
        role.name,
        role.scopeType,
        role.scopeType === 'club' ? input.clubId : null,
      );
    }

    return result;
  }

  async updateUser(actorId: string, targetUserId: string, input: UpdateAdminUserInput) {
    let passwordHash: string | undefined;
    if (input.password) {
      passwordHash = await hashPassword(input.password);
    }
    const result = await this.repo.updateUserWithProfile(targetUserId, {
      name: input.name,
      email: input.email,
      rotaryId: input.rotaryId,
      clubId: input.clubId,
      phone: input.phone,
      passwordHash,
    });

    await this.audit.record({
      actorId,
      action: 'user.updated',
      resourceType: 'user',
      resourceId: targetUserId,
      after: {
        id: targetUserId,
        email: result.user.email,
        name: result.user.name,
        clubId: result.profile.clubId,
        rotaryId: result.profile.rotaryId,
      },
    });

    return result;
  }

  async deleteUser(actorId: string, targetUserId: string) {
    const existing = await this.repo.findUser(targetUserId);
    if (!existing) throw new NotFoundException('User not found');
    await this.repo.deleteUser(targetUserId);
    await this.audit.record({
      actorId,
      action: 'user.deleted',
      resourceType: 'user',
      resourceId: targetUserId,
      before: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
      },
    });
    return { success: true };
  }

  private async notifyAccessGranted(
    actorId: string,
    targetUserId: string,
    roleName: string,
    scopeType: ScopeKind,
    scopeId: string | null,
  ): Promise<void> {
    try {
      let targetUserEmail: string | undefined;
      let targetUserName: string | undefined;

      if (this.prisma) {
        const user = await this.prisma.user.findUnique({
          where: { id: targetUserId },
          select: { name: true, email: true },
        });
        if (user) {
          targetUserEmail = user.email;
          targetUserName = user.name;
        }

        // 1. In-portal Notification (announcement feed for member)
        await this.prisma.announcement.create({
          data: {
            title: `Access Granted: ${roleName}`,
            body: `You have been assigned the ${roleName} role with ${scopeType} scope${scopeId ? ` (${scopeId})` : ''}. Your portal dashboard and administration tools have been updated.`,
            audience: { userIds: [targetUserId] },
            channels: ['portal', 'email'],
            createdById: actorId,
            sentAt: new Date(),
            recipientCount: 1,
          },
        });
      }

      // 2. Email Notification
      if (this.emailPool && targetUserEmail) {
        const recipientName = targetUserName || 'Rotaractor';
        const scopeDesc = scopeType === 'none' ? 'District-Wide' : `${scopeType.toUpperCase()}${scopeId ? ` (${scopeId})` : ''}`;
        const baseOrigin = env.WEB_ORIGINS.find((o) => o.includes('testing')) || env.WEB_ORIGINS.find((o) => !o.includes('ride') && !o.includes('rcl')) || 'https://rotaract3011.org';
        const portalUrl = `${baseOrigin}/portal`;
        const plainText = `Hello ${recipientName},\n\nYou have been assigned the ${roleName} role with ${scopeDesc} scope by the District Administrator.\n\nSign in to the District Portal: ${portalUrl}\n\nRotaract District Organization 3011`;
        await this.emailPool.send({
          to: targetUserEmail,
          subject: `Access Update: ${roleName} role assigned on Rotaract District Organization 3011`,
          text: plainText,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px;">
              <div style="margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
                <span style="font-size: 20px; font-weight: 800; color: #d946ef; letter-spacing: -0.5px;">ROTARACT DISTRICT ORGANIZATION 3011</span>
                <span style="font-size: 13px; color: #64748b; margin-left: 8px; font-weight: 600;">PORTAL NOTIFICATION</span>
              </div>
              <h2 style="margin-top: 0; margin-bottom: 12px; font-size: 22px; font-weight: 700; color: #0f172a;">New Role & Access Granted</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
                Dear <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
                You have been assigned the <strong>${roleName}</strong> role with <strong>${scopeDesc}</strong> scope by the District Administrator.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 4px;">Role Details</div>
                <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${roleName}</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Scope: <strong>${scopeDesc}</strong></div>
              </div>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                Your portal permissions have been updated automatically. You can sign in immediately to access your updated workspace and tools.
              </p>
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${portalUrl}" style="display: inline-block; background-color: #d946ef; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(217, 70, 239, 0.2);">
                  Open District Portal &rarr;
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                Rotaract District Organization 3011 &bull; Delhi & National Capital Region &bull; Rotary International
              </p>
            </div>
          `,
        });
      }
    } catch {
      // Best-effort notification: do not fail role grant if email or announcement fails
    }
  }

  private async resolveScopeId(scopeType: ScopeKind, scopeId?: string): Promise<string | null> {
    if (scopeType === 'none') {
      if (scopeId) throw new BadRequestException('An unscoped role cannot carry a scopeId');
      return null;
    }
    if (!scopeId) throw new BadRequestException(`A ${scopeType}-scoped role requires a scopeId`);
    if (!(await this.repo.scopeExists(scopeType, scopeId))) {
      throw new NotFoundException(`No ${scopeType} with id "${scopeId}"`);
    }
    return scopeId;
  }

  private async resolvePermissionIds(keys: string[]): Promise<string[]> {
    const unique = [...new Set(keys)];
    const unknown = unique.filter((key) => !isPermissionKey(key));
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown permission keys: ${unknown.join(', ')}`);
    }
    const ids = await this.repo.permissionIdsByKeys(unique);
    const unseeded = unique.filter((key) => !ids.has(key));
    if (unseeded.length > 0) {
      throw new BadRequestException(`Permission keys not seeded: ${unseeded.join(', ')}`);
    }
    return unique.map((key) => ids.get(key) as string);
  }

  private roleAuditFields(role: RoleRecord, input: UpdateRoleInput): Record<string, unknown> {
    const fields: Record<string, unknown> = { id: role.id, key: role.key };
    if (input.name !== undefined) fields.name = role.name;
    if (input.description !== undefined) fields.description = role.description;
    if (input.scopeType !== undefined) fields.scopeType = role.scopeType;
    if (input.permissionKeys !== undefined) fields.permissionKeys = role.permissionKeys;
    return fields;
  }
}