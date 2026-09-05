import type { FeedbackRow } from './feedback.types';

export function feedbackDto(row: FeedbackRow) {
  return {
    id: row.id,
    submittedById: row.submittedById,
    clubId: row.clubId,
    category: row.category,
    message: row.message,
    eventId: row.eventId,
    status: row.status,
    reply: row.reply,
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
