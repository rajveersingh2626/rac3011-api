import type { ListingRow } from './careerbridge.types';

export function listingDto(row: ListingRow) {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    type: row.type,
    location: row.location,
    mode: row.mode,
    stipend: row.stipend,
    description: row.description,
    applyUrl: row.applyUrl,
    contactEmail: row.contactEmail,
    postedByName: row.postedByName,
    postedByEmail: row.postedByEmail,
    rotaryAffiliation: row.rotaryAffiliation,
    status: row.status,
    verifiedById: row.verifiedById,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    filledAt: row.filledAt ? row.filledAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Public-facing shape: no poster identity, no internal review metadata.
export function publicListingDto(row: ListingRow) {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    type: row.type,
    location: row.location,
    mode: row.mode,
    stipend: row.stipend,
    description: row.description,
    applyUrl: row.applyUrl,
    contactEmail: row.contactEmail,
    rotaryAffiliation: row.rotaryAffiliation,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
