import type { PastDrrRow } from './heritage.types';

export function pastDrrDto(row: PastDrrRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    terms: row.terms,
    homeClubId: row.homeClubId,
    photoUrl: row.photoUrl,
    bio: row.bio,
    isLowResPhoto: row.isLowResPhoto,
  };
}
