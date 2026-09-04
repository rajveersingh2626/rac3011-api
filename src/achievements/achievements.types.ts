export type AchievementRow = {
  id: string;
  type: 'chartered_club' | 'award' | 'milestone';
  title: string;
  clubId: string | null;
  date: Date;
  certificateUrl: string | null;
  description: string | null;
  order: number;
};
