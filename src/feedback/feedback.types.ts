export const FEEDBACK_CATEGORIES = ['general', 'event', 'club'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export type FeedbackStatus = 'open' | 'reviewed' | 'closed';

export type FeedbackRow = {
  id: string;
  submittedById: string | null;
  clubId: string | null;
  category: string;
  message: string;
  eventId: string | null;
  status: FeedbackStatus;
  reply: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FeedbackListFilter = { status?: FeedbackStatus; eventId?: string; clubId?: string };

export type FeedbackCreateInput = {
  submittedById: string | null;
  clubId: string | null;
  category: FeedbackCategory;
  message: string;
  eventId: string | null;
};
