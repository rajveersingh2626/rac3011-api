import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import type { RequestContext } from '../../common/types/access';
import type { CreateFixtureInput } from './dto/create-fixture.dto';
import type { PutFixtureInput } from './dto/put-fixture.dto';
import { RclFixturesRepository } from './rcl-fixtures.repository';
import type { FixtureListFilter, FixtureRow } from './rcl.types';

@Injectable()
export class RclFixturesService {
  constructor(
    private readonly repo: RclFixturesRepository,
    private readonly audit: AuditService,
  ) {}

  list(
    filter: FixtureListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: FixtureRow[]; total: number }> {
    return this.repo.findMany(filter, page, pageSize);
  }

  async get(id: string): Promise<FixtureRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(input: CreateFixtureInput): Promise<FixtureRow> {
    const [home, away] = await Promise.all([
      this.repo.findTeamRef(input.homeTeamId),
      this.repo.findTeamRef(input.awayTeamId),
    ]);
    if (!home) throw new BadRequestException(`Unknown homeTeamId: ${input.homeTeamId}`);
    if (!away) throw new BadRequestException(`Unknown awayTeamId: ${input.awayTeamId}`);
    if (home.season !== away.season) {
      throw new BadRequestException('homeTeamId and awayTeamId must belong to the same season');
    }
    return this.repo.create({
      season: home.season,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: new Date(input.scheduledAt),
      venue: input.venue ?? null,
    });
  }

  async putResult(ctx: RequestContext, id: string, input: PutFixtureInput): Promise<FixtureRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();

    if (input.result?.winnerTeamId) {
      const winner = input.result.winnerTeamId;
      if (winner !== existing.homeTeamId && winner !== existing.awayTeamId) {
        throw new BadRequestException("winnerTeamId must be one of the fixture's two teams");
      }
    }

    // A result implies the match is done unless the caller explicitly marks it abandoned instead.
    let status = input.status ?? existing.status;
    if (input.result && status !== 'abandoned') status = 'completed';

    const updated = await this.repo.updateFixtureAndResult(
      id,
      {
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        venue: input.venue,
        status,
      },
      input.result
        ? {
            homeRuns: input.result.homeRuns,
            homeWickets: input.result.homeWickets,
            homeOvers: input.result.homeOvers,
            awayRuns: input.result.awayRuns,
            awayWickets: input.result.awayWickets,
            awayOvers: input.result.awayOvers,
            winnerTeamId: input.result.winnerTeamId,
            notes: input.result.notes ?? null,
            enteredById: ctx.user.id,
          }
        : undefined,
    );

    if (input.result) {
      await this.audit.record({
        actorId: ctx.user.id,
        action: 'rcl.fixture.result_entered',
        resourceType: 'rcl_fixture',
        resourceId: id,
        before: { status: existing.status },
        after: { status: updated.status, winnerTeamId: input.result.winnerTeamId },
      });
    }
    return updated;
  }
}
