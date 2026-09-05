import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  FixtureCreate,
  FixtureListFilter,
  FixtureRow,
  FixtureUpdate,
  ResultInput,
} from './rcl.types';

const CLUB_REF_SELECT = { id: true, name: true, shortName: true } satisfies Prisma.ClubSelect;
const TEAM_REF_SELECT = {
  id: true,
  name: true,
  clubId: true,
  club: { select: CLUB_REF_SELECT },
} satisfies Prisma.RclTeamSelect;
const RESULT_SELECT = {
  homeRuns: true,
  homeWickets: true,
  homeOvers: true,
  awayRuns: true,
  awayWickets: true,
  awayOvers: true,
  winnerTeamId: true,
  notes: true,
  enteredById: true,
} satisfies Prisma.RclResultSelect;
const FIXTURE_SELECT = {
  id: true,
  season: true,
  homeTeamId: true,
  homeTeam: { select: TEAM_REF_SELECT },
  awayTeamId: true,
  awayTeam: { select: TEAM_REF_SELECT },
  scheduledAt: true,
  venue: true,
  status: true,
  result: { select: RESULT_SELECT },
  createdAt: true,
} satisfies Prisma.RclFixtureSelect;

type RawFixture = Prisma.RclFixtureGetPayload<{ select: typeof FIXTURE_SELECT }>;

function mapFixture(raw: RawFixture): FixtureRow {
  return {
    id: raw.id,
    season: raw.season,
    homeTeamId: raw.homeTeamId,
    homeTeam: raw.homeTeam,
    awayTeamId: raw.awayTeamId,
    awayTeam: raw.awayTeam,
    scheduledAt: raw.scheduledAt,
    venue: raw.venue,
    status: raw.status,
    result: raw.result
      ? {
          homeRuns: raw.result.homeRuns,
          homeWickets: raw.result.homeWickets,
          homeOvers: Number(raw.result.homeOvers),
          awayRuns: raw.result.awayRuns,
          awayWickets: raw.result.awayWickets,
          awayOvers: Number(raw.result.awayOvers),
          winnerTeamId: raw.result.winnerTeamId,
          notes: raw.result.notes,
          enteredById: raw.result.enteredById,
        }
      : null,
    createdAt: raw.createdAt,
  };
}

function whereFor(filter: FixtureListFilter): Prisma.RclFixtureWhereInput {
  const clauses: Prisma.RclFixtureWhereInput[] = [];
  if (filter.season) clauses.push({ season: filter.season });
  if (filter.status) clauses.push({ status: filter.status });
  return clauses.length > 0 ? { AND: clauses } : {};
}

@Injectable()
export class RclFixturesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: FixtureListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: FixtureRow[]; total: number }> {
    const where = whereFor(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rclFixture.findMany({
        where,
        select: FIXTURE_SELECT,
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rclFixture.count({ where }),
    ]);
    return { items: items.map(mapFixture), total };
  }

  async findById(id: string): Promise<FixtureRow | null> {
    const raw = await this.prisma.rclFixture.findUnique({ where: { id }, select: FIXTURE_SELECT });
    return raw ? mapFixture(raw) : null;
  }

  findTeamRef(id: string): Promise<{ id: string; season: number } | null> {
    return this.prisma.rclTeam.findUnique({ where: { id }, select: { id: true, season: true } });
  }

  async create(data: FixtureCreate): Promise<FixtureRow> {
    const created = await this.prisma.rclFixture.create({
      data: {
        season: data.season,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        scheduledAt: data.scheduledAt,
        venue: data.venue,
      },
      select: { id: true },
    });
    return this.mustFind(created.id);
  }

  async updateFixtureAndResult(
    id: string,
    fixture: FixtureUpdate,
    result?: ResultInput & { enteredById: string },
  ): Promise<FixtureRow> {
    await this.prisma.$transaction(async (tx) => {
      await tx.rclFixture.update({ where: { id }, data: fixture });
      if (result) {
        const resultData = {
          homeRuns: result.homeRuns,
          homeWickets: result.homeWickets,
          homeOvers: result.homeOvers,
          awayRuns: result.awayRuns,
          awayWickets: result.awayWickets,
          awayOvers: result.awayOvers,
          winnerTeamId: result.winnerTeamId,
          notes: result.notes,
          enteredById: result.enteredById,
        };
        await tx.rclResult.upsert({
          where: { fixtureId: id },
          create: { fixtureId: id, ...resultData },
          update: resultData,
        });
      }
    });
    return this.mustFind(id);
  }

  private async mustFind(id: string): Promise<FixtureRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`RclFixture ${id} vanished after write`);
    return row;
  }
}
