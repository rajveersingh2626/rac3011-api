export type PastDrrRow = {
  id: string;
  name: string;
  slug: string;
  terms: string[];
  homeClubId: string | null;
  photoUrl: string | null;
  bio: string | null;
  order: number;
  isLowResPhoto: boolean;
};
