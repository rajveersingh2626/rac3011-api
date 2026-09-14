import type { GalleryItemRow } from './gallery.types';

export function galleryItemAdminDto(row: GalleryItemRow) {
  return {
    id: row.id,
    title: row.title,
    eventName: row.eventName,
    category: row.category,
    imageUrl: row.imageUrl,
    caption: row.caption,
    date: row.date.toISOString().slice(0, 10),
    order: row.order,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
    date: row.date.toISOString().slice(0, 10),
    order: row.order,
  };
}
