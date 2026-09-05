import type { ProjectRow } from './showcase.types';

const day = (d: Date): string => d.toISOString().slice(0, 10);

export function projectDto(row: ProjectRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: day(row.date),
    summary: row.summary,
    body: row.body,
    beneficiaries: row.beneficiaries,
    photos: row.photos,
    submittedById: row.submittedById,
    status: row.status,
    consentConfirmed: row.consentConfirmed,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    publishedTitle: row.publishedTitle,
    publishedSummary: row.publishedSummary,
    publishedBody: row.publishedBody,
    editorNotes: row.editorNotes,
    rejectionReason: row.rejectionReason,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    publishedById: row.publishedById,
    clubs: row.clubs.map((c) => ({ role: c.role, club: c.club })),
  };
}
