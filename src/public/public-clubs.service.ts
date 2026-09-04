import { Injectable, NotFoundException } from '@nestjs/common';
import { ShowcaseService } from '../showcase/showcase.service';
import { PublicClubsRepository } from './public-clubs.repository';
import type { PublicBoardMemberRow, PublicClubRow } from './public-clubs.types';

@Injectable()
export class PublicClubsService {
  constructor(
    private readonly repo: PublicClubsRepository,
    private readonly showcase: ShowcaseService,
  ) {}

  list(zoneId?: string): Promise<PublicClubRow[]> {
    return this.repo.findMany(zoneId);
  }

  async bySlug(
    slug: string,
    include: { board: boolean; projects: boolean },
  ): Promise<{
    club: PublicClubRow;
    board: PublicBoardMemberRow[] | undefined;
    projects: Awaited<ReturnType<ShowcaseService['list']>>['items'] | undefined;
  }> {
    const club = await this.repo.findBySlug(slug);
    if (!club) throw new NotFoundException();
    const board = include.board ? await this.repo.currentBoard(club.id) : undefined;
    const projects = include.projects
      ? (await this.showcase.list({ clubSlug: slug }, 1, 50)).items
      : undefined;
    return { club, board, projects };
  }
}
