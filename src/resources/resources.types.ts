export const RESOURCE_CATEGORIES = [
  'documents',
  'forms',
  'logos',
  'photos',
  'guest_kit',
  'templates',
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export type ResourceRow = {
  id: string;
  category: ResourceCategory;
  title: string;
  description: string | null;
  url: string;
  isLocked: boolean;
  requiredPermission: string | null;
  comingSoonMonth: string | null;
  order: number;
};
