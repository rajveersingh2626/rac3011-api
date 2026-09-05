export const ANNOUNCEMENT_CHANNELS = ['portal', 'email', 'push'] as const;
export type AnnouncementChannel = (typeof ANNOUNCEMENT_CHANNELS)[number];

// {roleKeys[],zoneIds[],clubIds[],memberIds[]} per spec §6.6, stored as-is in `audience` Json.
export type AnnouncementAudience = {
  roleKeys?: string[];
  zoneIds?: string[];
  clubIds?: string[];
  memberIds?: string[];
};

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  channels: AnnouncementChannel[];
  sendAt: Date | null;
  sentAt: Date | null;
  recipientCount: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AnnouncementCreateInput = {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  channels: AnnouncementChannel[];
  createdById: string;
};

// A role-holder candidate for the audience query in src/announcements/audience-resolver.ts:
// the DB query already filters to users holding one of the requested roleKeys (any scope);
// this row carries what's needed to test whether they're also in the requested zone/club.
export type RoleHolderCandidate = {
  userId: string;
  clubId: string | null;
  zoneId: string | null;
  scopedClubIds: string[];
  scopedZoneIds: string[];
};
