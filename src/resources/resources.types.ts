export type ResourceRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  url: string;
  isLocked: boolean;
  requiredPermission: string | null;
  comingSoonMonth: string | null;
  order: number;
};
