import type { CampRow } from './mission3011.types';

const day = (d: Date): string => d.toISOString().slice(0, 10);

export function campDto(row: CampRow) {
  return {
    id: row.id,
    leadClub: row.leadClub,
    date: day(row.date),
    venue: row.venue,
    city: row.city,
    unitsCollected: row.unitsCollected,
    donorsRegistered: row.donorsRegistered,
    partnerBloodBank: row.partnerBloodBank,
    photos: row.photos,
    status: row.status,
    submittedById: row.submittedById,
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    rejectionReason: row.rejectionReason,
    participatingClubs: row.clubs.map((c) => c.club),
    createdAt: row.createdAt.toISOString(),
  };
}
