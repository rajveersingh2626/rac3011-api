import type { ResourceRow } from './resources.types';

// Spec §5.3: locked resources are listed, not hidden — url is withheld from anonymous callers, the row and its lock badge still render.
export function publicResourceDto(row: ResourceRow) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    url: row.isLocked ? null : row.url,
    isLocked: row.isLocked,
    comingSoonMonth: row.comingSoonMonth,
  };
}

export function resourceAdminDto(row: ResourceRow) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    url: row.url,
    isLocked: row.isLocked,
    requiredPermission: row.requiredPermission,
    comingSoonMonth: row.comingSoonMonth,
    order: row.order,
  };
}
