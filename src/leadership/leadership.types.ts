export type DistrictTeamRow = {
  id: string;
  name: string;
  designation: string;
  kind: 'core' | 'dsc';
  order: number;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  clubId: string | null;
  ryYear: number;
};
