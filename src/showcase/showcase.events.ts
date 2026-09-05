export const SHOWCASE_PUBLISHED_EVENT = 'showcase.published';

export interface ShowcasePublishedEvent {
  projectId: string;
  leadClubId: string;
  ryYear: number;
  publishedAt: string;
}
