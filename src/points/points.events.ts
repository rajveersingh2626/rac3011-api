export const POINTS_RECOMPUTED_EVENT = 'points.recomputed';
export const CLUB_FACTS_UPDATED_EVENT = 'club_facts.updated';

export type PointsRecomputedEvent = { clubId: string; ryYear: number };
export type ClubFactsUpdatedEvent = { clubId: string; ryYear: number };
