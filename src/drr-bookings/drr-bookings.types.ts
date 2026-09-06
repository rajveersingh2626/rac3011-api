export const BOOKING_PURPOSES = ['installation', 'club_event', 'meeting'] as const;
export type BookingPurpose = (typeof BOOKING_PURPOSES)[number];

export const BOOKING_STATUSES = [
  'requested',
  'held',
  'confirmed',
  'declined',
  'cancelled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Only these two transitions are wired: the calendar/hold flow is out of scope.
export const BOOKING_DECISIONS = ['confirmed', 'declined'] as const;
export type BookingDecision = (typeof BOOKING_DECISIONS)[number];

export const DECIDABLE_FROM: readonly BookingStatus[] = ['requested', 'held'];

export type DrrBookingRow = {
  id: string;
  reference: string;
  purpose: BookingPurpose;
  clubId: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  status: BookingStatus;
  decisionReason: string | null;
  decidedById: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DrrBookingCreateInput = {
  reference: string;
  purpose: BookingPurpose;
  clubId: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
};

export type DrrBookingListFilter = {
  status?: BookingStatus;
  clubId?: string;
  from?: Date;
  to?: Date;
};

export type DrrOfficer = { userId: string; email: string | null };

export class DuplicateBookingReferenceError extends Error {}
