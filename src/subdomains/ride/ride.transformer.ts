import type { DelegationRow, GalleryItemRow, SupportClubRow } from './ride.types';

const day = (d: Date): string => d.toISOString().slice(0, 10);

export function supportClubDto(row: SupportClubRow) {
  return {
    id: row.id,
    ryYear: row.ryYear,
    club: row.club,
    capacityDelegates: row.capacityDelegates,
    homestayAvailable: row.homestayAvailable,
    preferredMonths: row.preferredMonths,
    contactMemberId: row.contactMemberId,
    contactPhone: row.contactPhone,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function delegationDto(row: DelegationRow) {
  return {
    id: row.id,
    ryYear: row.ryYear,
    visitingDistrict: row.visitingDistrict,
    country: row.country,
    startsAt: day(row.startsAt),
    endsAt: day(row.endsAt),
    headcount: row.headcount,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    status: row.status,
    hosts: row.hosts.map((h) => ({
      id: h.id,
      club: h.club,
      daysHosted: h.daysHosted,
      membersSent: h.membersSent,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Public surface: no contact name/email, no per-host operational detail beyond which club hosted.
export function delegationPublicDto(row: DelegationRow) {
  return {
    id: row.id,
    ryYear: row.ryYear,
    visitingDistrict: row.visitingDistrict,
    country: row.country,
    startsAt: day(row.startsAt),
    endsAt: day(row.endsAt),
    headcount: row.headcount,
    status: row.status,
    hosts: row.hosts.map((h) => h.club),
  };
}

export function galleryItemDto(row: GalleryItemRow) {
  return {
    id: row.id,
    year: row.year,
    url: row.url,
    kind: row.kind,
    caption: row.caption,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
  };
}
