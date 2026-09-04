import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { env } from '../config/env';
import { MeService } from '../me/me.service';
import { ScopeService } from '../common/scope/scope.service';
import type { RequestContext } from '../common/types/access';
import { CodedConflictException } from '../common/errors/conflict.error';
import { assertUploadAllowed } from './mime';
import type { StoredFileRecord } from './storage.repository';
import { StorageRepository } from './storage.repository';
import type { StoredFile } from './storage.port';
import { StoragePort } from './storage.port';
import type { UploadTarget } from './upload-targets';
import { resolveUploadTarget } from './upload-targets';
import type { CreateGrantInput } from './dto/create-grant.dto';

const GRANT_TTL_MS = 15 * 60 * 1000;

export type StoredFileView =
  { redirectUrl: string } | { stream: NodeJS.ReadableStream; mimeType: string; name: string };

@Injectable()
export class StorageService {
  constructor(
    private readonly repo: StorageRepository,
    private readonly port: StoragePort,
    private readonly scope: ScopeService,
    private readonly me: MeService,
  ) {}

  async createGrant(
    ctx: RequestContext,
    input: CreateGrantInput,
  ): Promise<{ grantId: string; uploadUrl: string; fields?: Record<string, string> }> {
    const target = resolveUploadTarget(input.resourceType);
    if (target.tier !== input.tier) {
      throw new BadRequestException(
        `resourceType ${input.resourceType} uses the ${target.tier} tier, not ${input.tier}`,
      );
    }
    assertUploadAllowed(target.tier, input.mimeType, input.size);
    await this.assertCanUpload(ctx, target, input.resourceId);

    const grant = await this.port.createUploadGrant({
      tier: target.tier,
      mimeType: input.mimeType,
      size: input.size,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      userId: ctx.user.id,
    });
    await this.repo.createGrant({
      id: grant.grantId,
      tier: target.tier,
      provider: this.providerNameFor(target.tier),
      mimeType: input.mimeType,
      size: input.size,
      name: input.name ?? input.resourceType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      clubId: target.ownership === 'own_club' ? input.resourceId : undefined,
      userId: ctx.user.id,
      uploadUrl: grant.uploadUrl,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS),
    });
    return grant;
  }

  async finaliseGrant(
    ctx: RequestContext,
    grantId: string,
    providerKey: string,
  ): Promise<StoredFile> {
    const grant = await this.repo.findGrant(grantId);
    if (!grant || grant.userId !== ctx.user.id) throw new NotFoundException();
    if (grant.status !== 'pending')
      throw new CodedConflictException('INVALID_TRANSITION', 'Grant already used');
    if (grant.expiresAt.getTime() < Date.now())
      throw new CodedConflictException('INVALID_TRANSITION', 'Grant expired');

    const stored = await this.port.finalise(grantId, providerKey);
    const file = await this.repo.createFile({
      id: stored.id,
      tier: stored.tier,
      provider: grant.provider,
      providerKey,
      url: stored.url,
      name: stored.name,
      mimeType: stored.mimeType,
      size: stored.size,
      resourceType: grant.resourceType,
      resourceId: grant.resourceId,
      clubId: grant.clubId,
      uploadedById: ctx.user.id,
    });
    await this.repo.markGrantFinalised(grantId, file.id);
    return toStoredFile(file);
  }

  async getFile(ctx: RequestContext, id: string): Promise<StoredFileView> {
    const file = await this.repo.findFile(id);
    if (!file) throw new NotFoundException();
    if (file.tier !== 'private') return { redirectUrl: file.url ?? '' };
    await this.assertCanReadPrivate(ctx, file.resourceType, file.clubId, file.resourceId);
    const streamed = await this.port.getPrivateStream(id);
    return { stream: streamed.stream, mimeType: streamed.mimeType, name: streamed.name };
  }

  async deleteFile(ctx: RequestContext, id: string): Promise<void> {
    const file = await this.repo.findFile(id);
    if (!file) throw new NotFoundException();
    const target = resolveUploadTarget(file.resourceType);
    await this.assertCanUpload(ctx, target, file.resourceId ?? undefined);
    await this.port.delete(id);
    await this.repo.deleteFile(id);
  }

  private providerNameFor(tier: 'permanent' | 'dynamic' | 'private'): string {
    if (env.STORAGE_DRIVER === 'stub') return 'stub';
    return tier === 'private' ? 'r2' : 'uploadthing';
  }

  private async assertCanUpload(
    ctx: RequestContext,
    target: UploadTarget,
    resourceId?: string,
  ): Promise<void> {
    if (ctx.access.isSuperAdmin) return;
    if (!target.permissions.some((p) => (ctx.access.grants[p] ?? []).length > 0))
      throw new ForbiddenException();

    if (target.ownership === 'district') return;
    if (target.ownership === 'project') {
      const projectKey = target.projectKey;
      if (!projectKey) throw new ForbiddenException();
      const ok = target.permissions.some((p) =>
        this.scope.canAccessProject(ctx.access, p, projectKey),
      );
      if (!ok) throw new ForbiddenException();
      return;
    }
    if (target.ownership === 'own_club') {
      if (!resourceId)
        throw new BadRequestException('resourceId is required for this resourceType');
      const checks = await Promise.all(
        target.permissions.map((p) => this.scope.canAccessClub(ctx.access, p, resourceId)),
      );
      if (!checks.some(Boolean)) throw new ForbiddenException();
      return;
    }
    if (target.ownership === 'own_member_row') {
      if (!resourceId)
        throw new BadRequestException('resourceId is required for this resourceType');
      const ownProfileId = await this.me.findProfileIdForUser(ctx.user.id);
      if (ownProfileId !== resourceId) throw new ForbiddenException();
    }
  }

  private async assertCanReadPrivate(
    ctx: RequestContext,
    resourceType: string,
    clubId: string | null,
    resourceId: string | null,
  ): Promise<void> {
    if (ctx.access.isSuperAdmin) return;
    const target = resolveUploadTarget(resourceType);
    const hasAny = target.permissions.some((p) => (ctx.access.grants[p] ?? []).length > 0);
    if (!hasAny) throw new NotFoundException();
    if (target.ownership === 'district') return;
    if (target.ownership === 'own_club') {
      const id = clubId ?? resourceId;
      if (!id) throw new NotFoundException();
      const checks = await Promise.all(
        target.permissions.map((p) => this.scope.canAccessClub(ctx.access, p, id)),
      );
      if (!checks.some(Boolean)) throw new NotFoundException();
      return;
    }
    if (target.ownership === 'project') {
      const projectKey = target.projectKey;
      const ok =
        !!projectKey &&
        target.permissions.some((p) => this.scope.canAccessProject(ctx.access, p, projectKey));
      if (!ok) throw new NotFoundException();
      return;
    }
    if (target.ownership === 'own_member_row') {
      const ownProfileId = await this.me.findProfileIdForUser(ctx.user.id);
      if (!resourceId || ownProfileId !== resourceId) throw new NotFoundException();
    }
  }
}

function toStoredFile(row: StoredFileRecord): StoredFile {
  return {
    id: row.id,
    tier: row.tier,
    key: row.providerKey,
    url: row.url,
    name: row.name,
    mimeType: row.mimeType,
    size: row.size,
  };
}
