import type { AnnouncementRow } from './announcements.types';

export function announcementDto(row: AnnouncementRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    channels: row.channels,
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    recipientCount: row.recipientCount,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
  };
}
