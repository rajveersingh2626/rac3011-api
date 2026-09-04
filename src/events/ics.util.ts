import { createEvent, createEvents, type EventAttributes } from 'ics';
import type { PublicEventRow } from './events.types';

function toArray(d: Date): [number, number, number, number, number] {
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

function toAttributes(row: PublicEventRow): EventAttributes {
  const end = row.endsAt ?? new Date(row.startsAt.getTime() + 60 * 60 * 1000);
  return {
    title: row.title,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    start: toArray(row.startsAt),
    end: toArray(end),
    uid: row.id,
  };
}

export function eventToIcs(row: PublicEventRow): string {
  const result = createEvent(toAttributes(row));
  if (result.error || !result.value) throw result.error ?? new Error('ics generation failed');
  return result.value;
}

export function eventsToIcs(rows: PublicEventRow[]): string {
  const result = createEvents(rows.map(toAttributes));
  if (result.error || !result.value) throw result.error ?? new Error('ics generation failed');
  return result.value;
}
