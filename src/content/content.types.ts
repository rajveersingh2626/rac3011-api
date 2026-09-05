export const CONTENT_TYPES = ['text', 'richtext', 'image', 'link', 'list'] as const;
export type ContentBlockType = (typeof CONTENT_TYPES)[number];

export type ContentBlockAdminRow = {
  id: string;
  pageKey: string;
  sectionKey: string;
  type: ContentBlockType;
  draftValue: unknown;
  publishedValue: unknown;
  publishedAt: Date | null;
  updatedById: string | null;
};
