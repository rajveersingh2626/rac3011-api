export const MEMBER_STATUSES = ['pending', 'approved', 'suspended'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export type MemberClubSummary = { id: string; name: string; shortName: string | null };

export type MemberRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  rotaryId: string | null;
  clubId: string;
  photoUrl: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  membershipAnniversary: Date | null;
  status: MemberStatus;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  directoryOptIn: boolean;
  isDacMember: boolean;
  createdAt: Date;
  club: MemberClubSummary;
};

export type MemberListFilter = {
  status?: MemberStatus;
  clubId?: string;
  q?: string;
};

export type RegisterMemberInput = {
  fullName: string;
  email: string;
  password: string;
  clubId: string;
  phone?: string;
  rotaryId?: string;
};

export type MemberStatusUpdate = {
  status: 'approved' | 'suspended';
  rejectionReason?: string | null;
};

export type DirectoryFilter = {
  q?: string;
  skill?: string;
  interest?: string;
  clubId?: string;
  zoneId?: string;
};

export type DirectoryEntryRow = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  skills: string[];
  interests: string[];
  club: {
    id: string;
    name: string;
    shortName: string | null;
    zoneId: string | null;
    zoneName: string | null;
  };
};

export type SkillTagRow = { id: string; label: string; kind: string };

export type ImportRowOutcome = 'new' | 'duplicate' | 'invalid';

export type ImportPreviewRow = {
  lineNumber: number;
  fullName: string;
  email: string;
  phone: string | null;
  rotaryId: string | null;
  outcome: ImportRowOutcome;
  errors: string[];
};

export type ImportPreviewResult = {
  id: string;
  clubId: string;
  rows: ImportPreviewRow[];
  summary: { total: number; new: number; duplicate: number; invalid: number };
};

export type ImportCommitResult = {
  id: string;
  clubId: string;
  committed: number;
  skipped: number;
  memberIds: string[];
};
