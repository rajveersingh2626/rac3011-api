import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { LeadershipRepository } from './leadership.repository';
import type { DistrictTeamRow } from './leadership.types';
import type {
  CreateDistrictTeamMemberInput,
  UpdateDistrictTeamMemberInput,
} from './dto/district-team-member.dto';

@Injectable()
export class LeadershipService {
  constructor(
    private readonly repo: LeadershipRepository,
    private readonly audit: AuditService,
  ) {}

  currentTeam(): Promise<DistrictTeamRow[]> {
    return this.repo.currentTeam();
  }

  listAdmin(): Promise<DistrictTeamRow[]> {
    return this.repo.findAllAdmin();
  }

  async get(id: string): Promise<DistrictTeamRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(actorId: string, input: CreateDistrictTeamMemberInput): Promise<DistrictTeamRow> {
    const row = await this.repo.create(input);
    await this.audit.record({
      actorId,
      action: 'district_team.created',
      resourceType: 'district_team_member',
      resourceId: row.id,
      after: row,
    });
    return row;
  }

  async update(
    actorId: string,
    id: string,
    input: UpdateDistrictTeamMemberInput,
  ): Promise<DistrictTeamRow> {
    const before = await this.get(id);
    const row = await this.repo.update(id, input);
    await this.audit.record({
      actorId,
      action: 'district_team.updated',
      resourceType: 'district_team_member',
      resourceId: id,
      before,
      after: row,
    });
    return row;
  }

  async remove(actorId: string, id: string): Promise<void> {
    const before = await this.get(id);
    await this.repo.delete(id);
    await this.audit.record({
      actorId,
      action: 'district_team.deleted',
      resourceType: 'district_team_member',
      resourceId: id,
      before,
    });
  }

  async reorder(actorId: string, ids: string[]): Promise<DistrictTeamRow[]> {
    await this.repo.reorder(ids);
    const items = await this.listAdmin();
    await this.audit.record({
      actorId,
      action: 'district_team.reordered',
      resourceType: 'district_team_member',
      after: { ids },
    });
    return items;
  }
}
