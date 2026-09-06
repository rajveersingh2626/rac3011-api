import type { DrrBookingRow } from './drr-bookings.types';

export function drrBookingAdminDto(row: DrrBookingRow) {
  return {
    id: row.id,
    reference: row.reference,
    purpose: row.purpose,
    clubId: row.clubId,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    requesterPhone: row.requesterPhone,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    notes: row.notes,
    status: row.status,
    decisionReason: row.decisionReason,
    decidedById: row.decidedById,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Reachable by anyone holding the reference, so it omits the requester's email and phone.
export function drrBookingPublicDto(row: DrrBookingRow) {
  return {
    reference: row.reference,
    purpose: row.purpose,
    clubId: row.clubId,
    requesterName: row.requesterName,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    notes: row.notes,
    status: row.status,
    decisionReason: row.decisionReason,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
