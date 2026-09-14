import type { GalleryItemRow } from './gallery.types';

function formatDate(d: unknown): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (d instanceof Date) return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  const parsed = new Date(String(d));
  return isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function formatIso(d: unknown): string {
  if (!d) return new Date().toISOString();
  if (d instanceof Date) return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  const parsed = new Date(String(d));
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function galleryItemAdminDto(row: GalleryItemRow) {
  return {
    id: row.id,
    title: row.title,
    eventName: row.eventName,
    category: row.category,
    imageUrl: row.imageUrl,
    caption: row.caption,
    date: formatDate(row.date),
    order: row.order,
    createdAt: formatIso(row.createdAt),
    updatedAt: formatIso(row.updatedAt),
  };
}

export function galleryItemPublicDto(row: GalleryItemRow) {
  return {
    id: row.id,
    title: row.title,
    eventName: row.eventName,
    category: row.category,
    imageUrl: row.imageUrl,
    caption: row.caption,
    date: formatDate(row.date),
    order: row.order,
  };
}

