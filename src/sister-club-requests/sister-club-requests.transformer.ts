import type { SisterClubRequestRow } from './sister-club-requests.types';

export function sisterClubRequestDto(row: SisterClubRequestRow) {
  return {
    id: row.id,
    clubId: row.clubId,
    partnerClubName: row.partnerClubName,
    partnerDistrict: row.partnerDistrict,
    country: row.country,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    status: row.status,
    signedOn: row.signedOn ? row.signedOn.toISOString().slice(0, 10) : null,
    submittedById: row.submittedById,
    createdAt: row.createdAt.toISOString(),
  };
}
