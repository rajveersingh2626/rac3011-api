import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CodedConflictException } from '../common/errors/conflict.error';
import { RolesService } from '../rbac/roles.service';
import type { ProjectKey } from '../public/project-summary.registry';
import { SettingsRepository, type SettingRow } from './settings.repository';
import { schemaForKey, subdomainKeyFromLeadClubSetting } from './settings.types';
import type { UpdateSettingsInput } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly repo: SettingsRepository,
    private readonly roles: RolesService,
    private readonly audit: AuditService,
  ) {}

  async listAll(): Promise<Record<string, unknown>> {
    const rows = await this.repo.findAll();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async update(actorId: string, input: UpdateSettingsInput): Promise<Record<string, unknown>> {
    const keys = Object.keys(input);
    for (const key of keys) {
      const schema = schemaForKey(key);
      if (!schema) throw new BadRequestException(`Unknown setting key "${key}"`);
      const result = schema.safeParse(input[key]);
      if (!result.success) {
        throw new BadRequestException(
          `Invalid value for setting "${key}": ${result.error.message}`,
        );
      }
    }

    const before = await this.repo.findMany(keys);
    const beforeByKey = new Map(before.map((r) => [r.key, r.value]));
    await this.repo.upsertMany(
      keys.map((key) => ({ key, value: input[key] })),
      actorId,
    );

    for (const key of keys) {
      const projectKey = subdomainKeyFromLeadClubSetting(key);
      if (!projectKey) continue;
      const previous = (beforeByKey.get(key) ?? null) as string | null;
      const next = (input[key] ?? null) as string | null;
      await this.syncLeadClubRole(actorId, projectKey as ProjectKey, previous, next);
    }

    await this.audit.record({
      actorId,
      action: 'settings.updated',
      resourceType: 'settings',
      resourceId: keys.join(','),
      before: Object.fromEntries(before.map((r) => [r.key, r.value])),
      after: input,
    });

    return this.listAll();
  }

  private async syncLeadClubRole(
    actorId: string,
    projectKey: ProjectKey,
    previousClubId: string | null,
    nextClubId: string | null,
  ): Promise<void> {
    if (previousClubId === nextClubId) return;
    const role = await this.roles.getRoleByKey(`project_admin:${projectKey}`);
    if (!role) return;

    if (previousClubId) {
      const userIds = await this.repo.findClubPresidentUserIds(previousClubId);
      for (const userId of userIds) {
        const grant = await this.roles.findExistingGrant(userId, role.id, 'project', projectKey);
        if (grant) await this.roles.revokeUserRole(actorId, grant.id);
      }
    }
    if (nextClubId) {
      const userIds = await this.repo.findClubPresidentUserIds(nextClubId);
      for (const userId of userIds) {
        try {
          await this.roles.grantUserRole(actorId, {
            userId,
            roleId: role.id,
            scopeType: 'project',
            scopeId: projectKey,
          });
        } catch (err) {
          if (!(err instanceof CodedConflictException)) throw err;
        }
      }
    }
  }
}

export type { SettingRow };
