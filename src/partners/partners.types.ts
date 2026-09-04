export type PartnerRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  tier: string;
  website: string | null;
  permissionStatus: 'pending' | 'granted';
  order: number;
};
