import type { ReportRequestResponseRow, ReportRequestRow } from './reports.types';

export function reportRequestDto(row: ReportRequestRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    questions: row.questions,
    audience: row.audience,
    dueAt: row.dueAt.toISOString(),
    createdById: row.createdById,
  };
}

export function reportRequestResponseDto(row: ReportRequestResponseRow) {
  return {
    id: row.id,
    requestId: row.requestId,
    clubId: row.clubId,
    answers: row.answers,
    submittedById: row.submittedById,
  };
}
