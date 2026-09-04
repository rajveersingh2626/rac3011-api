import type { ReportQueryRow, ReportWithRelations } from './reports.types';

const day = (d: Date): string => d.toISOString().slice(0, 10);

export function reportQueryDto(row: ReportQueryRow) {
  return {
    id: row.id,
    reportId: row.reportId,
    askedById: row.askedById,
    question: row.question,
    reply: row.reply,
    repliedById: row.repliedById,
    repliedAt: row.repliedAt ? row.repliedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function reportDto(row: ReportWithRelations) {
  return {
    id: row.id,
    clubId: row.clubId,
    ryYear: row.ryYear,
    month: day(row.month),
    schemaVersion: row.schemaVersion,
    status: row.status,
    values: row.values,
    notes: row.notes,
    submittedById: row.submittedById,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    filedOnTime: row.filedOnTime,
    scoredAt: row.scoredAt ? row.scoredAt.toISOString() : null,
    ...(row.queries ? { queries: row.queries.map(reportQueryDto) } : {}),
    ...(row.club ? { club: row.club } : {}),
  };
}
