import { Injectable, NotFoundException } from '@nestjs/common';
import { ScopeService } from '../common/scope/scope.service';
import type { ResolvedAccess } from '../common/types/access';
import type { ClubIncludes, ClubListFilter } from './clubs.repository';
import { ClubsRepository } from './clubs.repository';
import type { ClubUpdate, ClubWithRelations, ZoneRow } from './clubs.types';
import type { PutBoardInput } from './dto/put-board.dto';
import type { UpdateClubInput } from './dto/update-club.dto';

@Injectable()
export class ClubsService {
  constructor(
    private readonly repo: ClubsRepository,
    private readonly scope: ScopeService,
  ) {}

  async list(
    access: ResolvedAccess,
    filter: ClubListFilter,
    include: ClubIncludes,
    page: number,
    pageSize: number,
  ): Promise<{ items: ClubWithRelations[]; total: number }> {
    const scope = await this.scope.clubFilter(access, 'clubs:view');
    if ('clubIds' in scope && scope.clubIds.length === 0) return { items: [], total: 0 };
    return this.repo.findMany(filter, scope, include, page, pageSize);
  }

  async get(access: ResolvedAccess, id: string, include: ClubIncludes): Promise<ClubWithRelations> {
    await this.scope.assertCanAccessClub(access, 'clubs:view', id);
    const club = await this.repo.findById(id, include);
    if (!club) throw new NotFoundException();
    return club;
  }

  async update(
    access: ResolvedAccess,
    id: string,
    input: UpdateClubInput,
  ): Promise<ClubWithRelations> {
    await this.scope.assertCanAccessClub(access, 'clubs:edit', id);
    if (!(await this.repo.exists(id))) throw new NotFoundException();
    return this.repo.update(id, toClubUpdate(input));
  }

  async putBoard(
    access: ResolvedAccess,
    id: string,
    input: PutBoardInput,
  ): Promise<ClubWithRelations> {
    await this.scope.assertCanAccessClub(access, 'clubs:edit', id);
    if (!(await this.repo.exists(id))) throw new NotFoundException();
    await this.repo.replaceBoard(id, input.ryYear, input.members);
    const club = await this.repo.findById(id, { board: true });
    if (!club) throw new NotFoundException();
    return club;
  }

  listZones(): Promise<ZoneRow[]> {
    return this.repo.listZones();
  }
}

function toClubUpdate(input: UpdateClubInput): ClubUpdate {
  return {
    ...input,
    charterDate:
      input.charterDate === undefined
        ? undefined
        : input.charterDate
          ? new Date(input.charterDate)
          : null,
  };
}
