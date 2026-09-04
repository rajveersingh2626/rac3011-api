export type ClubRow = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string | null;
  zone: string | null;
  zoneId: string | null;
  lat: number | null;
  lng: number | null;
  president: string | null;
  phone: string | null;
  email: string | null;
  rotaryId: string | null;
  secretary: string | null;
  secretaryEmail: string | null;
  secretaryPhone: string | null;
  charterDate: Date | null;
  isActive: boolean;
  meetingInfo: string | null;
  socialLinks: unknown;
  logoUrl: string | null;
  memberCount: number;
};

export type BoardMemberRow = {
  id: string;
  clubId: string;
  memberId: string | null;
  name: string;
  position: string;
  bloodGroup: string | null;
  phone: string | null;
  email: string | null;
  ryYear: number;
  order: number;
};

export type ClubFactsRow = {
  id: string;
  clubId: string;
  ryYear: number;
  duesPaidOn: Date | null;
  riCitationCompleted: boolean;
  paulHarrisFellows: number;
  dualMembers: number;
  mdioCommitteeMembers: number;
  mdioEventsAttended: number;
  sisterClubSignedOn: Date | null;
  drrVisitOn: Date | null;
  vocationalCentreOn: Date | null;
  activeSocialHandles: number;
  clubMerchandise: boolean;
  clubWebsiteUrl: string | null;
  priorYearMemberCount: number | null;
};

export type ClubWithRelations = ClubRow & {
  board?: BoardMemberRow[];
  facts?: ClubFactsRow[];
};

export type ClubUpdate = {
  name?: string;
  shortName?: string | null;
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
  rotaryId?: string | null;
  secretary?: string | null;
  secretaryEmail?: string | null;
  secretaryPhone?: string | null;
  charterDate?: Date | null;
  isActive?: boolean;
  meetingInfo?: string | null;
  socialLinks?: unknown;
  logoUrl?: string | null;
};

export type BoardMemberInput = {
  memberId?: string | null;
  name: string;
  position: string;
  bloodGroup?: string | null;
  phone?: string | null;
  email?: string | null;
  order?: number;
};

export type ZoneRow = { id: string; name: string; order: number; clubCount?: number };
