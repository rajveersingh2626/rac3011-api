import { Injectable } from '@nestjs/common';
import { LeadershipRepository } from './leadership.repository';
import type { DistrictTeamRow } from './leadership.types';

@Injectable()
export class LeadershipService {
  constructor(private readonly repo: LeadershipRepository) {}

  currentTeam(): Promise<DistrictTeamRow[]> {
    return this.repo.currentTeam();
  }
}
