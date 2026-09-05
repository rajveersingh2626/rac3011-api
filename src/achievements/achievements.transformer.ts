import type { AchievementRow } from './achievements.types';

export function achievementDto(row: AchievementRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    clubId: row.clubId,
    date: row.date.toISOString().slice(0, 10),
    certificateUrl: row.certificateUrl,
    description: row.description,
  };
}

export function achievementAdminDto(row: AchievementRow) {
  return { ...achievementDto(row), order: row.order };
}
