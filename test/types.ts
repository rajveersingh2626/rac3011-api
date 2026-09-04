export type MeResponse = {
  user: { id: string; name: string; email: string; twoFactorEnabled: boolean };
  profile: { clubId: string } | null;
  roles: { roleKey: string; scope: { type: string; id?: string } }[];
  grants: Record<string, { type: string; id?: string }[]>;
  clubs: { id: string; name: string; shortName: string | null; zoneId: string | null }[];
  theme: string;
};

export type ClubListResponse = {
  items: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
};
