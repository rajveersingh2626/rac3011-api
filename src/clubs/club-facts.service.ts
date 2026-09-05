import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { ScopeService } from '../common/scope/scope.service';
import type { ResolvedAccess } from '../common/types/access';
import { CLUB_FACTS_UPDATED_EVENT } from '../points/points.events';
import { ClubFactsRepository, type ClubFactsUpdate } from './club-facts.repository';
import type { ClubFactsRow } from './clubs.types';
import type { UpdateClubFactsInput } from './dto/update-club-facts.dto';

const READ_PERMISSIONS = ['clubs:view', 'reports:review'] as const;

function toUpdate(input: UpdateClubFactsInput): ClubFactsUpdate {
  const day = (v: string | null | undefined): Date | null | undefined =>
    v === undefined ? undefined : v ? new Date(`${v}T00:00:00Z`) : null;
  return {
    duesPaidOn: day(input.duesPaidOn),
    riCitationCompleted: input.riCitationCompleted,
    paulHarrisFellows: input.paulHarrisFellows,
    dualMembers: input.dualMembers,
    mdioCommitteeMembers: input.mdioCommitteeMembers,
    mdioEventsAttended: input.mdioEventsAttended,
    sisterClubSignedOn: day(input.sisterClubSignedOn),
    drrVisitOn: day(input.drrVisitOn),
    vocationalCentreOn: day(input.vocationalCentreOn),
    activeSocialHandles: input.activeSocialHandles,
    clubMerchandise: input.clubMerchandise,
    clubWebsiteUrl: input.clubWebsiteUrl,
    priorYearMemberCount: input.priorYearMemberCount,
  };
}

@Injectable()
export class ClubFactsService {
  constructor(
    private readonly repo: ClubFactsRepository,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  async get(access: ResolvedAccess, clubId: string, ryYear: number): Promise<ClubFactsRow | null> {
    await this.scope.assertCanAccessClubAny(access, [...READ_PERMISSIONS], clubId);
    return this.repo.find(clubId, ryYear);
  }

  async update(
    access: ResolvedAccess,
    clubId: string,
    input: UpdateClubFactsInput,
  ): Promise<ClubFactsRow> {
    await this.scope.assertCanAccessClub(access, 'club_facts:edit', clubId);
    const before = await this.repo.find(clubId, input.ryYear);
    const after = await this.repo.upsert(clubId, input.ryYear, toUpdate(input), access.userId);
    await this.audit.record({
      actorId: access.userId,
      action: 'club_facts.updated',
      resourceType: 'club_facts',
      resourceId: after.id,
      before,
      after,
    });
    this.events.emit(CLUB_FACTS_UPDATED_EVENT, { clubId, ryYear: input.ryYear });
    return after;
  }
}
