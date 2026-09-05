import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { ryYearOf } from '../common/ry-year';
import { CodedConflictException } from '../common/errors/conflict.error';
import { ScopeService } from '../common/scope/scope.service';
import type { RequestContext, ResolvedAccess } from '../common/types/access';
import { MeService } from '../me/me.service';
import { NotificationPort } from '../notifications/notification.port';
import { PointsEngineService } from '../points/engine/points-engine.service';
import type { CreateProjectInput, UpdateProjectInput } from './dto/project.dto';
import { ShowcaseAdminRepository } from './showcase-admin.repository';
import { SHOWCASE_PUBLISHED_EVENT } from './showcase.events';
import { slugify } from './slug.util';
import type { ProjectListFilter, ProjectRow } from './showcase.types';

const OWNER_KEYS = [
  'title',
  'category',
  'date',
  'summary',
  'body',
  'beneficiaries',
  'photos',
  'collaboratingClubIds',
  'consentConfirmed',
] as const;
const PUBLISHER_KEYS = [
  'publishedTitle',
  'publishedSummary',
  'publishedBody',
  'editorNotes',
  'rejectionReason',
] as const;
const OWNER_EDITABLE_STATUSES = ['draft', 'rejected'] as const;

@Injectable()
export class ShowcaseAdminService {
  constructor(
    private readonly repo: ShowcaseAdminRepository,
    private readonly scope: ScopeService,
    private readonly me: MeService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationPort,
    private readonly events: EventEmitter2,
    private readonly pointsEngine: PointsEngineService,
  ) {}

  async list(
    ctx: RequestContext,
    filter: ProjectListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: ProjectRow[]; total: number }> {
    if (this.hasPublishGrant(ctx.access)) {
      const clubScope = await this.scope.clubFilter(ctx.access, 'showcase:publish');
      const narrowed = ScopeService.narrowClubs(clubScope, filter.clubId);
      if ('clubIds' in narrowed && narrowed.clubIds.length === 0) return { items: [], total: 0 };
      return this.repo.findQueue(narrowed, filter, page, pageSize);
    }
    return this.repo.findOwn(ctx.user.id, filter, page, pageSize);
  }

  async get(ctx: RequestContext, id: string): Promise<ProjectRow> {
    const project = await this.repo.findById(id);
    if (!project) throw new NotFoundException();
    if (project.submittedById === ctx.user.id) return project;
    await this.scope.assertCanAccessClub(ctx.access, 'showcase:publish', this.leadClubId(project));
    return project;
  }

  async create(ctx: RequestContext, input: CreateProjectInput): Promise<ProjectRow> {
    const profile = await this.me.getProfile(ctx);
    if (!profile) throw new BadRequestException('No member profile for this account');
    await this.scope.assertCanAccessClub(ctx.access, 'showcase:submit', profile.clubId);

    const requestedCollaborators = [...new Set(input.collaboratingClubIds ?? [])].filter(
      (id) => id !== profile.clubId,
    );
    const validIds = await this.repo.findExistingClubIds(requestedCollaborators);
    const invalid = requestedCollaborators.filter((id) => !validIds.has(id));
    if (invalid.length > 0)
      throw new BadRequestException(`Unknown club id(s): ${invalid.join(', ')}`);

    const created = await this.repo.create({
      title: input.title,
      category: input.category,
      date: new Date(`${input.date}T00:00:00Z`),
      summary: input.summary,
      body: input.body ?? null,
      beneficiaries: input.beneficiaries ?? null,
      photos: input.photos ?? [],
      submittedById: ctx.user.id,
      consentConfirmed: input.consentConfirmed ?? false,
    });
    await this.repo.replaceClubs(created.id, [
      { clubId: profile.clubId, role: 'lead' },
      ...requestedCollaborators.map((clubId) => ({ clubId, role: 'collaborator' as const })),
    ]);
    return this.mustFind(created.id);
  }

  async update(ctx: RequestContext, id: string, input: UpdateProjectInput): Promise<ProjectRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();

    const ownerKeys = OWNER_KEYS.filter((k) => input[k] !== undefined);
    const publisherKeys = PUBLISHER_KEYS.filter((k) => input[k] !== undefined);
    const isSubmitTransition = input.status === 'submitted';
    const isPublishTransition = input.status === 'published' || input.status === 'rejected';
    const actsAsOwner = ownerKeys.length > 0 || isSubmitTransition;
    const actsAsPublisher = publisherKeys.length > 0 || isPublishTransition;

    if (actsAsOwner && actsAsPublisher) {
      throw new BadRequestException(
        'Cannot mix submitter fields with publisher fields in one request',
      );
    }
    if (actsAsPublisher) return this.updateAsPublisher(ctx, existing, input);
    return this.updateAsOwner(ctx, existing, input, ownerKeys.length > 0);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    if (existing.submittedById !== ctx.user.id) throw new NotFoundException();
    await this.scope.assertCanAccessClub(ctx.access, 'showcase:submit', this.leadClubId(existing));
    if (existing.status !== 'draft') {
      throw new CodedConflictException(
        'INVALID_TRANSITION',
        'Only a draft submission can be deleted',
      );
    }
    await this.repo.remove(id);
  }

  private async updateAsOwner(
    ctx: RequestContext,
    existing: ProjectRow,
    input: UpdateProjectInput,
    hasContentEdits: boolean,
  ): Promise<ProjectRow> {
    if (existing.submittedById !== ctx.user.id) throw new NotFoundException();
    const leadClubId = this.leadClubId(existing);
    await this.scope.assertCanAccessClub(ctx.access, 'showcase:submit', leadClubId);

    const editable = (OWNER_EDITABLE_STATUSES as readonly string[]).includes(existing.status);
    if ((hasContentEdits || input.status === 'submitted') && !editable) {
      throw new CodedConflictException(
        'INVALID_TRANSITION',
        `Cannot edit a ${existing.status} project`,
      );
    }

    let collaboratorIds: string[] | undefined;
    if (input.collaboratingClubIds !== undefined) {
      const ids = [...new Set(input.collaboratingClubIds)].filter((cid) => cid !== leadClubId);
      const validIds = await this.repo.findExistingClubIds(ids);
      const invalid = ids.filter((cid) => !validIds.has(cid));
      if (invalid.length > 0)
        throw new BadRequestException(`Unknown club id(s): ${invalid.join(', ')}`);
      collaboratorIds = ids;
    }

    if (input.status === 'submitted') {
      const consentAfterUpdate = input.consentConfirmed ?? existing.consentConfirmed;
      if (!consentAfterUpdate)
        throw new BadRequestException('Consent must be confirmed before submitting');
    }

    await this.repo.update(existing.id, {
      title: input.title,
      category: input.category,
      date: input.date ? new Date(`${input.date}T00:00:00Z`) : undefined,
      summary: input.summary,
      body: input.body,
      beneficiaries: input.beneficiaries,
      photos: input.photos,
      consentConfirmed: input.consentConfirmed,
      status: input.status,
      submittedAt: input.status === 'submitted' ? new Date() : undefined,
    });
    if (collaboratorIds !== undefined) {
      await this.repo.replaceClubs(existing.id, [
        { clubId: leadClubId, role: 'lead' },
        ...collaboratorIds.map((clubId) => ({ clubId, role: 'collaborator' as const })),
      ]);
    }

    if (input.status === 'submitted') {
      const officerIds = await this.repo.findClubOfficerUserIds(leadClubId);
      if (officerIds.length > 0) {
        await this.notifications.notify({
          template: 'showcase-submitted',
          to: officerIds.map((userId) => ({ userId })),
          data: {
            projectId: existing.id,
            title: input.title ?? existing.title,
            submittedById: ctx.user.id,
          },
        });
      }
    }

    return this.mustFind(existing.id);
  }

  private async updateAsPublisher(
    ctx: RequestContext,
    existing: ProjectRow,
    input: UpdateProjectInput,
  ): Promise<ProjectRow> {
    const leadClubId = this.leadClubId(existing);
    // No showcase:publish grant at all -> 403, not 404 (matches a single-permission guard).
    if (!this.hasPublishGrant(ctx.access)) throw new ForbiddenException();
    await this.scope.assertCanAccessClub(ctx.access, 'showcase:publish', leadClubId);

    if (input.status === 'rejected' && existing.status !== 'submitted') {
      throw new CodedConflictException(
        'INVALID_TRANSITION',
        `Cannot reject a ${existing.status} project`,
      );
    }
    if (input.status === 'rejected' && !(input.rejectionReason ?? existing.rejectionReason)) {
      throw new BadRequestException('rejectionReason is required to reject a project');
    }
    if (input.status === 'published' && !['submitted', 'published'].includes(existing.status)) {
      throw new CodedConflictException(
        'INVALID_TRANSITION',
        `Cannot publish a ${existing.status} project`,
      );
    }
    const publishedTitle = input.publishedTitle ?? existing.publishedTitle ?? existing.title;
    const publishedSummary =
      input.publishedSummary ?? existing.publishedSummary ?? existing.summary;
    if (input.status === 'published' && (!publishedTitle || !publishedSummary)) {
      throw new BadRequestException('publishedTitle and publishedSummary are required to publish');
    }

    let slug = existing.slug;
    if (input.status === 'published' && !slug) slug = await this.uniqueSlug(publishedTitle);

    await this.repo.update(existing.id, {
      publishedTitle: input.publishedTitle,
      publishedSummary: input.publishedSummary,
      publishedBody: input.publishedBody,
      editorNotes: input.editorNotes,
      rejectionReason: input.rejectionReason,
      status: input.status,
      slug: input.status === 'published' ? slug : undefined,
      publishedAt: input.status === 'published' ? (existing.publishedAt ?? new Date()) : undefined,
      publishedById: input.status === 'published' ? ctx.user.id : undefined,
    });

    if (input.status === 'published' || input.status === 'rejected') {
      await this.audit.record({
        actorId: ctx.user.id,
        action: input.status === 'published' ? 'showcase.published' : 'showcase.rejected',
        resourceType: 'project',
        resourceId: existing.id,
        after: {
          status: input.status,
          rejectionReason: input.rejectionReason ?? existing.rejectionReason,
        },
      });
      if (existing.submittedById) {
        await this.notifications.notify({
          template: input.status === 'published' ? 'showcase-published' : 'showcase-rejected',
          to: [{ userId: existing.submittedById }],
          data: {
            projectId: existing.id,
            rejectionReason: input.rejectionReason ?? existing.rejectionReason,
          },
        });
      }
    }
    if (input.status === 'published') {
      const ryYear = ryYearOf(existing.date);
      this.events.emit(SHOWCASE_PUBLISHED_EVENT, {
        projectId: existing.id,
        leadClubId,
        ryYear,
        publishedAt: new Date().toISOString(),
      });
      await this.pointsEngine.recompute({
        clubId: leadClubId,
        ryYear,
        trigger: SHOWCASE_PUBLISHED_EVENT,
      });
    }

    return this.mustFind(existing.id);
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let n = 2;
    while (await this.repo.slugExists(candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  }

  private hasPublishGrant(access: ResolvedAccess): boolean {
    return access.isSuperAdmin || (access.grants['showcase:publish'] ?? []).length > 0;
  }

  private leadClubId(project: ProjectRow): string {
    const lead = project.clubs.find((c) => c.role === 'lead');
    if (!lead) throw new NotFoundException();
    return lead.club.id;
  }

  private async mustFind(id: string): Promise<ProjectRow> {
    const project = await this.repo.findById(id);
    if (!project) throw new NotFoundException();
    return project;
  }
}
