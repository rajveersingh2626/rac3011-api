import type { PublishedProjectRow } from './showcase.types';

export function publicProjectSummaryDto(row: PublishedProjectRow) {
  const lead = row.clubs.find((c) => c.role === 'lead')?.club ?? null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.publishedTitle,
    summary: row.publishedSummary,
    category: row.category,
    date: row.date.toISOString().slice(0, 10),
    photos: row.photos,
    leadClub: lead,
  };
}

export function publicProjectDetailDto(row: PublishedProjectRow) {
  return {
    ...publicProjectSummaryDto(row),
    body: row.publishedBody,
    beneficiaries: row.beneficiaries,
    clubs: row.clubs.map((c) => ({ role: c.role, club: c.club })),
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}
