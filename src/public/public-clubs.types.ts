export type PublicClubRow = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string | null;
  zoneId: string | null;
  lat: number | null;
  lng: number | null;
  president: string | null;
  phone: string | null;
  email: string | null;
  secretary: string | null;
  secretaryEmail: string | null;
  secretaryPhone: string | null;
  meetingInfo: string | null;
  socialLinks: unknown;
  logoUrl: string | null;
  memberCount: number;
  charterDate: Date | null;
};

export type PublicBoardMemberRow = {
  id: string;
  name: string;
  position: string;
  bloodGroup: string | null;
  phone: string | null;
  email: string | null;
  ryYear: number;
  order: number;
};
