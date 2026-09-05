import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CodedConflictException } from '../common/errors/conflict.error';
import type { ScopeKind } from '../common/types/access';
import { isPermissionKey } from '../common/types/permission-keys';
import { CreateRoleInput, UpdateRoleInput } from './dto/role.dto';
import { CreateUserRoleInput } from './dto/user-role.dto';
import { RbacRepository, RoleRecord, UserRoleRecord } from './rbac.repository';

@Injectable()
export class RolesService {
  constructor(
    private readonly repo: RbacRepository,
    private readonly audit: AuditService,
  ) {}

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
    return grant;
  }

  async revokeUserRole(actorId: string, id: string): Promise<void> {
    const grant = await this.repo.findUserRole(id);
    if (!grant) throw new NotFoundException('Grant not found');
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
