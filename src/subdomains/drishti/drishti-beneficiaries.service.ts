import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { env } from '../../config/env';
import { ScopeService, type ClubScopeFilter } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import { MeService } from '../../me/me.service';
import type { CreateBeneficiaryInput } from './dto/create-beneficiary.dto';
import type { UpdateBeneficiaryInput } from './dto/update-beneficiary.dto';
import { DrishtiBeneficiariesRepository } from './drishti-beneficiaries.repository';
import { encryptPhone } from './drishti-pii.util';
import type { BeneficiaryListFilter, BeneficiaryRow } from './drishti.types';

const MANAGE_PERMISSION = 'subdomain:drishti:manage' as const;
const OFFICER_PERMISSION = 'club_events:log' as const;
const FORWARD_STAGES = ['screened', 'scheduled', 'operated', 'followup', 'closed'] as const;

@Injectable()
export class DrishtiBeneficiariesService {
  constructor(
    private readonly repo: DrishtiBeneficiariesRepository,
    private readonly scope: ScopeService,
    private readonly me: MeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    ctx: RequestContext,
    filter: BeneficiaryListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: BeneficiaryRow[]; total: number }> {
    const scope = await this.clubScopeFor(ctx);
    const narrowed = ScopeService.narrowClubs(scope, filter.clubId);
    if ('clubIds' in narrowed && narrowed.clubIds.length === 0) return { items: [], total: 0 };
    return this.repo.findMany(filter, page, pageSize, narrowed);
  }

  async get(ctx: RequestContext, id: string): Promise<BeneficiaryRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    if (!this.hasManageGrant(ctx)) {
      await this.scope.assertCanAccessClub(ctx.access, OFFICER_PERMISSION, row.clubId);
    }
    return row;
  }

  /** Manage-grant callers see every club; everyone else (club_events:log officers, already
   * required by the route guard) are scoped to their own club(s) only. */
  private async clubScopeFor(ctx: RequestContext): Promise<ClubScopeFilter> {
    if (this.hasManageGrant(ctx)) return { all: true };
    return this.scope.clubFilter(ctx.access, OFFICER_PERMISSION);
  }

  async create(ctx: RequestContext, input: CreateBeneficiaryInput): Promise<BeneficiaryRow> {
    const hasManageGrant = this.hasManageGrant(ctx);
    let clubId: string;
    if (hasManageGrant && input.clubId) {
      const club = await this.repo.findClub(input.clubId);
      if (!club) throw new BadRequestException(`Unknown club id: ${input.clubId}`);
      clubId = club.id;
    } else {
      const profile = await this.me.getProfile(ctx);
      if (!profile) throw new BadRequestException('No member profile for this account');
      const isOfficer = await this.scope.canAccessClubAny(
        ctx.access,
        [OFFICER_PERMISSION],
        profile.clubId,
      );
      if (!isOfficer && !hasManageGrant) {
        throw new ForbiddenException(
          'Only a club president or secretary can log a Drishti patient',
        );
      }
      clubId = profile.clubId;
    }

    const created = await this.repo.create({
      clubId,
      name: input.name,
      age: input.age ?? null,
      gender: input.gender ?? null,
      phoneEncrypted: input.phone ? encryptPhone(input.phone, env.DRISHTI_PII_KEY) : null,
      eye: input.eye,
      screenedOn: new Date(`${input.screenedOn}T00:00:00Z`),
      campLocation: input.campLocation ?? null,
      notes: input.notes ?? null,
      createdById: ctx.user.id,
    });

    // No plaintext phone in the audit trail - only presence, never the value.
    await this.audit.record({
      actorId: ctx.user.id,
      action: 'drishti.beneficiary.created',
      resourceType: 'drishti_beneficiary',
      resourceId: created.id,
      after: { clubId, hasPhone: !!input.phone, eye: input.eye },
    });
    return created;
  }

  async update(
    ctx: RequestContext,
    id: string,
    input: UpdateBeneficiaryInput,
  ): Promise<BeneficiaryRow> {
    if (!this.hasManageGrant(ctx)) throw new ForbiddenException();
    this.scope.assertCanAccessProject(ctx.access, MANAGE_PERMISSION, 'drishti');

    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();

    if (input.stage) {
      const currentIndex = FORWARD_STAGES.indexOf(existing.stage);
      const nextIndex = FORWARD_STAGES.indexOf(input.stage);
      if (nextIndex === currentIndex + 1 && input.stage === 'operated' && !input.surgery) {
        throw new BadRequestException('surgery details are required when moving to operated');
      }
    }
    if (input.surgery && input.stage && input.stage !== 'operated') {
      throw new BadRequestException(
        'surgery can only be recorded when moving to the operated stage',
      );
    }

    const updated = await this.repo.update(
      existing.id,
      { stage: input.stage, notes: input.notes },
      input.surgery
        ? {
            hospital: input.surgery.hospital,
            operatedOn: new Date(`${input.surgery.operatedOn}T00:00:00Z`),
            outcome: input.surgery.outcome ?? null,
            followupOn: input.surgery.followupOn
              ? new Date(`${input.surgery.followupOn}T00:00:00Z`)
              : null,
          }
        : undefined,
    );

    if (input.stage || input.surgery) {
      await this.audit.record({
        actorId: ctx.user.id,
        action: 'drishti.beneficiary.stage_changed',
        resourceType: 'drishti_beneficiary',
        resourceId: existing.id,
        before: { stage: existing.stage },
        after: {
          stage: updated.stage,
          surgery: input.surgery ? input.surgery.hospital : undefined,
        },
      });
    }
    return updated;
  }

  private hasManageGrant(ctx: RequestContext): boolean {
    return ctx.access.isSuperAdmin || (ctx.access.grants[MANAGE_PERMISSION] ?? []).length > 0;
  }
}
