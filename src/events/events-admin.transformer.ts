import type { CheckinRow, ClubAttendanceCount, EventRow, RsvpStatus } from './events-admin.types';

export function eventAdminDto(
  row: EventRow,
  extra?: { myRsvp?: RsvpStatus | null; goingCount?: number; checkinCount?: number },
) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    location: row.location,
    description: row.description,
    coverUrl: row.coverUrl,
    isDistrictEvent: row.isDistrictEvent,
    clubId: row.clubId,
    projectKey: row.projectKey,
    rsvpOpen: row.rsvpOpen,
    capacity: row.capacity,
    photos: row.photos,
    createdById: row.createdById,
    ...(extra?.myRsvp !== undefined ? { myRsvp: extra.myRsvp } : {}),
    ...(extra?.goingCount !== undefined ? { goingCount: extra.goingCount } : {}),
    ...(extra?.checkinCount !== undefined ? { checkinCount: extra.checkinCount } : {}),
  };
}

export function checkinDto(row: CheckinRow, alreadyCheckedIn: boolean) {
  return {
    id: row.id,
    eventId: row.eventId,
    memberId: row.memberId,
    walkInName: row.walkInName,
    clubId: row.clubId,
    method: row.method,
    checkedInAt: row.checkedInAt.toISOString(),
    alreadyCheckedIn,
  };
}

export function clubAttendanceDto(row: ClubAttendanceCount) {
  return { clubId: row.clubId, clubName: row.clubName, count: row.count };
}
