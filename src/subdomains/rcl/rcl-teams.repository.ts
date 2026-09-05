import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClubScopeFilter } from '../../common/scope/scope.service';
import { RclTeamConflictError } from './rcl.types';
import type { TeamCreate, TeamListFilter, TeamRow, TeamUpdate } from './rcl.types';

const CLUB_REF_SELECT = { id: true, name: true, shortName: true } satisfies Prisma.ClubSelect;
const PLAYER_SELECT = {
  id: true,
  teamId: true,
  memberId: true,
  name: true,
  role: true,
} satisfies Prisma.RclPlayerSelect;
const TEAM_SELECT = {
  id: true,
  season: true,
  clubId: true,
  club: { select: CLUB_REF_SELECT },
  name: true,
  captainName: true,
  captainPhone: true,
  status: true,
  players: { select: PLAYER_SELECT, orderBy: { createdAt: 'asc' } },
  createdById: true,
  createdAt: true,
} satisfies Prisma.RclTeamSelect;

function whereFor(filter: TeamListFilter, scope?: ClubScopeFilter): Prisma.RclTeamWhereInput {
  const clauses: Prisma.RclTeamWhereInput[] = [];
  if (filter.season) clauses.push({ season: filter.season });
  if (filter.clubId) clauses.push({ clubId: filter.clubId });
  if (filter.status) clauses.push({ status: filter.status });
  if (scope && !('all' in scope)) clauses.push({ clubId: { in: scope.clubIds } });
  return clauses.length > 0 ? { AND: clauses } : {};
}

@Injectable()
export class RclTeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: TeamListFilter,
    page: number,
    pageSize: number,
    scope?: ClubScopeFilter,
  ): Promise<{ items: TeamRow[]; total: number }> {
    const where = whereFor(filter, scope);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rclTeam.findMany({
        where,
        select: TEAM_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rclTeam.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<TeamRow | null> {
    return this.prisma.rclTeam.findUnique({ where: { id }, select: TEAM_SELECT });
  }

  findClub(clubId: string): Promise<{ id: string } | null> {
    return this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
  }

  async create(data: TeamCreate): Promise<TeamRow> {
    try {
      const created = await this.prisma.rclTeam.create({
        data: {
          season: data.season,
          clubId: data.clubId,
          name: data.name,
          captainName: data.captainName,
          captainPhone: data.captainPhone,
          createdById: data.createdById,
          players: {
            create: data.players.map((p) => ({
              name: p.name,
              memberId: p.memberId ?? null,
              role: p.role ?? null,
            })),
          },
        },
        select: { id: true },
      });
      return await this.mustFind(created.id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new RclTeamConflictError(
          `A team already exists for club ${data.clubId} in season ${data.season}`,
        );
      }
      throw err;
    }
  }

  async update(id: string, data: TeamUpdate): Promise<TeamRow> {
    await this.prisma.$transaction(async (tx) => {
      await tx.rclTeam.update({
        where: { id },
        data: {
          name: data.name,
          captainName: data.captainName,
          captainPhone: data.captainPhone,
          status: data.status,
        },
      });
      if (data.players !== undefined) {
        await tx.rclPlayer.deleteMany({ where: { teamId: id } });
        if (data.players.length > 0) {
          await tx.rclPlayer.createMany({
            data: data.players.map((p) => ({
              teamId: id,
              name: p.name,
              memberId: p.memberId ?? null,
              role: p.role ?? null,
            })),
          });
        }
      }
    });
    return this.mustFind(id);
  }

  private async mustFind(id: string): Promise<TeamRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`RclTeam ${id} vanished after write`);
    return row;
  }
}
