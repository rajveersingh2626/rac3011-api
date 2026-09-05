export type TeamStatusKind = 'registered' | 'confirmed' | 'withdrawn';
export type FixtureStatusKind = 'scheduled' | 'completed' | 'abandoned';

export type ClubRef = { id: string; name: string; shortName: string | null };

export type PlayerRow = {
  id: string;
  teamId: string;
  memberId: string | null;
  name: string;
  role: string | null;
};

export type TeamRow = {
  id: string;
  season: number;
  clubId: string;
  club: ClubRef;
  name: string;
  captainName: string;
  captainPhone: string;
  status: TeamStatusKind;
  players: PlayerRow[];
  createdById: string;
  createdAt: Date;
};

export type TeamListFilter = { season?: number; clubId?: string; status?: TeamStatusKind };

export type PlayerInput = { name: string; memberId?: string | null; role?: string | null };

export type TeamCreate = {
  clubId: string;
  season: number;
  name: string;
  captainName: string;
  captainPhone: string;
  players: PlayerInput[];
  createdById: string;
};

export type TeamUpdate = Partial<{
  name: string;
  captainName: string;
  captainPhone: string;
  status: TeamStatusKind;
  players: PlayerInput[];
}>;

// Signals the (season, clubId) unique constraint without the service layer touching @prisma/client.
export class RclTeamConflictError extends Error {}

export type TeamRef = { id: string; name: string; clubId: string; club: ClubRef };

export type ResultRow = {
  homeRuns: number;
  homeWickets: number;
  homeOvers: number;
  awayRuns: number;
  awayWickets: number;
  awayOvers: number;
  winnerTeamId: string | null;
  notes: string | null;
  enteredById: string;
};

export type FixtureRow = {
  id: string;
  season: number;
  homeTeamId: string;
  homeTeam: TeamRef;
  awayTeamId: string;
  awayTeam: TeamRef;
  scheduledAt: Date;
  venue: string | null;
  status: FixtureStatusKind;
  result: ResultRow | null;
  createdAt: Date;
};

export type FixtureListFilter = { season?: number; status?: FixtureStatusKind };

export type FixtureCreate = {
  season: number;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  venue: string | null;
};

export type ResultInput = {
  homeRuns: number;
  homeWickets: number;
  homeOvers: number;
  awayRuns: number;
  awayWickets: number;
  awayOvers: number;
  winnerTeamId: string | null;
  notes: string | null;
};

export type FixtureUpdate = Partial<{
  scheduledAt: Date;
  venue: string | null;
  status: FixtureStatusKind;
}>;

export type RclSettings = { pointsWin: number; pointsTie: number; season: number };
