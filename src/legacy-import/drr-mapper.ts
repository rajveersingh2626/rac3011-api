import { slugify } from './club-mapper';
import type { ScrapedDrr } from './legacy-import.types';

export type PastDrrInput = {
  name: string;
  slug: string;
  terms: string[];
  homeClubId: string | null;
  bio: string | null;
  order: number;
  photoKey: string | null;
};

// Generic filler used for pre-3011 entries; not a real club to link.
const UNRESOLVABLE_HOME_CLUBS = new Set([
  'district 301',
  'district 3010',
  'district 3011',
  'rotaract district 3011',
]);

export function drrSlug(entry: ScrapedDrr): string {
  return entry.photo ? slugify(entry.photo) : `${slugify(entry.name)}-${entry.year}`;
}

export function resolveHomeClubId(
  homeClub: string,
  clubsByNormalizedName: Map<string, string>,
): string | null {
  if (UNRESOLVABLE_HOME_CLUBS.has(homeClub.trim().toLowerCase())) return null;
  return clubsByNormalizedName.get(homeClub.trim().toLowerCase()) ?? null;
}

export function mapDrrRecord(
  entry: ScrapedDrr,
  clubsByNormalizedName: Map<string, string>,
): PastDrrInput {
  const homeClubId = resolveHomeClubId(entry.homeClub, clubsByNormalizedName);
  return {
    name: entry.name,
    slug: drrSlug(entry),
    terms: [entry.year],
    homeClubId,
    bio: homeClubId ? null : `Home club: ${entry.homeClub}`,
    order: entry.srNo,
    photoKey: entry.hasPhoto ? entry.photo : null,
  };
}

export type ExistingDrrRow = {
  name: string;
  terms: string[];
  homeClubId: string | null;
  bio: string | null;
};

// Fill-only, like club-mapper's mergeClubFields: a re-run must not clobber a hand-edited
// bio or a manually-corrected homeClubId with the scrape's original values.
export function mergeDrrFields(
  existing: ExistingDrrRow,
  mapped: PastDrrInput,
  newPhotoUrl: string | null,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (!existing.name) data.name = mapped.name;
  if (existing.terms.length === 0) data.terms = mapped.terms;
  if (!existing.homeClubId && mapped.homeClubId) data.homeClubId = mapped.homeClubId;
  if (!existing.bio && mapped.bio) data.bio = mapped.bio;
  if (newPhotoUrl) data.photoUrl = newPhotoUrl;
  return data;
}
