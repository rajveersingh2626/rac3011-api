import type { PublicationRow } from './publications.types';

export function publicationDto(row: PublicationRow) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    url: row.url,
    month: row.month.toISOString().slice(0, 7),
    coverUrl: row.coverUrl,
  };
}
