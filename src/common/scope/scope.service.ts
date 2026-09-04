import { Injectable, NotFoundException } from '@nestjs/common';
import type { PermissionKey } from '../types/permission-keys';
import type { ProjectKey, ResolvedAccess, Scope, ScopeFilter } from '../types/access';
import { ScopeRepository } from './scope.repository';

export type ClubScopeFilter = { all: true } | { clubIds: string[] };

@Injectable()
export class ScopeService {
  constructor(private readonly repo: ScopeRepository) {}

  private scopesFor(access: ResolvedAccess, permission: PermissionKey): Scope[] {
    return access.grants[permission] ?? [];
  }

  async canAccessClub(
    access: ResolvedAccess,
    permission: PermissionKey,
    clubId: string,
  ): Promise<boolean> {
    if (access.isSuperAdmin) return true;
    const scopes = this.scopesFor(access, permission);
    if (scopes.some((s) => s.type === 'none')) return true;
    if (scopes.some((s) => s.type === 'club' && s.id === clubId)) return true;
    const zoneIds = scopes.filter((s) => s.type === 'zone' && s.id).map((s) => s.id as string);
    if (zoneIds.length === 0) return false;
    const zoneId = await this.repo.findZoneIdOfClub(clubId);
    return !!zoneId && zoneIds.includes(zoneId);
  }

  async assertCanAccessClub(
    access: ResolvedAccess,
    permission: PermissionKey,
    clubId: string,
  ): Promise<void> {
    if (!(await this.canAccessClub(access, permission, clubId))) throw new NotFoundException();
  }

  canAccessProject(
    access: ResolvedAccess,
    permission: PermissionKey,
    projectKey: ProjectKey,
  ): boolean {
    if (access.isSuperAdmin) return true;
    return this.scopesFor(access, permission).some(
      (s) => s.type === 'none' || (s.type === 'project' && s.id === projectKey),
    );
  }

  assertCanAccessProject(
    access: ResolvedAccess,
    permission: PermissionKey,
    projectKey: ProjectKey,
  ): void {
    if (!this.canAccessProject(access, permission, projectKey)) throw new NotFoundException();
  }

  async clubFilter(access: ResolvedAccess, permission: PermissionKey): Promise<ClubScopeFilter> {
    if (access.isSuperAdmin) return { all: true };
    const scopes = this.scopesFor(access, permission);
    if (scopes.some((s) => s.type === 'none')) return { all: true };
    const clubIds = new Set(
      scopes.filter((s) => s.type === 'club' && s.id).map((s) => s.id as string),
    );
    const zoneIds = scopes.filter((s) => s.type === 'zone' && s.id).map((s) => s.id as string);
    for (const id of await this.repo.findClubIdsInZones(zoneIds)) clubIds.add(id);
    return { clubIds: [...clubIds] };
  }

  /** Union of clubFilter across several permissions, for routes gated by @RequirePermission(a, b). */
  async clubFilterAny(
    access: ResolvedAccess,
    permissions: PermissionKey[],
  ): Promise<ClubScopeFilter> {
    if (access.isSuperAdmin) return { all: true };
    const filters = await Promise.all(permissions.map((p) => this.clubFilter(access, p)));
    if (filters.some((f) => 'all' in f)) return { all: true };
    const clubIds = new Set<string>();
    for (const f of filters) if ('clubIds' in f) for (const id of f.clubIds) clubIds.add(id);
    return { clubIds: [...clubIds] };
  }

  async canAccessClubAny(
    access: ResolvedAccess,
    permissions: PermissionKey[],
    clubId: string,
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.canAccessClub(access, permission, clubId)) return true;
    }
    return false;
  }

  async assertCanAccessClubAny(
    access: ResolvedAccess,
    permissions: PermissionKey[],
    clubId: string,
  ): Promise<void> {
    if (!(await this.canAccessClubAny(access, permissions, clubId))) throw new NotFoundException();
  }

  static narrowClubs(
    filter: ClubScopeFilter,
    requestedClubId: string | undefined,
  ): ClubScopeFilter {
    if (!requestedClubId) return filter;
    if ('all' in filter) return { clubIds: [requestedClubId] };
    return { clubIds: filter.clubIds.includes(requestedClubId) ? [requestedClubId] : [] };
  }

  static projectFilter(access: ResolvedAccess, permission: PermissionKey): ScopeFilter {
    if (access.isSuperAdmin) return { all: true };
    const scopes = access.grants[permission] ?? [];
    if (scopes.some((s) => s.type === 'none')) return { all: true };
    return {
      projectKeys: scopes
        .filter((s) => s.type === 'project' && s.id)
        .map((s) => s.id as ProjectKey),
    };
  }
}
