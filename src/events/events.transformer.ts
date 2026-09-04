import type { PublicEventRow } from './events.types';

export function publicEventDto(row: PublicEventRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    location: row.location,
    description: row.description,
    coverUrl: row.coverUrl,
    rsvpOpen: row.rsvpOpen,
    capacity: row.capacity,
  };
}
