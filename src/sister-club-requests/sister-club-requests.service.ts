import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ScopeService } from '../common/scope/scope.service';
import type { ResolvedAccess } from '../common/types/access';
import { SisterClubRequestsRepository } from './sister-club-requests.repository';
import type { SisterClubRequestRow } from './sister-club-requests.types';
import type {
  CreateSisterClubRequestInput,
  UpdateSisterClubRequestInput,
} from './dto/sister-club-request.dto';

@Injectable()
export class SisterClubRequestsService {
  constructor(
    private readonly repo: SisterClubRequestsRepository,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  list(status?: string): Promise<SisterClubRequestRow[]> {
    return this.repo.findAll(status);
  }

  async get(id: string): Promise<SisterClubRequestRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(
    actorId: string,
    access: ResolvedAccess,
    input: CreateSisterClubRequestInput,
  ): Promise<SisterClubRequestRow> {
    const canManage =
      access.isSuperAdmin || (access.grants['public_content:manage'] ?? []).length > 0;
    if (!canManage) {
      await this.scope.assertCanAccessClub(access, 'clubs:edit', input.clubId);
    }
    const row = await this.repo.create({ ...input, submittedById: actorId });
    await this.audit.record({
      actorId,
      action: 'sister_club_request.created',
      resourceType: 'sister_club_request',
      resourceId: row.id,
      after: row,
    });
    return row;
  }

  async update(
    actorId: string,
    id: string,
    input: UpdateSisterClubRequestInput,
  ): Promise<SisterClubRequestRow> {
    const before = await this.get(id);
    const row = await this.repo.update(id, input);
    await this.audit.record({
      actorId,
      action: 'sister_club_request.updated',
      resourceType: 'sister_club_request',
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
      action: 'sister_club_request.deleted',
      resourceType: 'sister_club_request',
      resourceId: id,
      before,
    });
  }
}
