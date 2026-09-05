import type { DirectoryEntryRow, MemberRow, SkillTagRow } from './members.types';

export type MemberDto = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  rotaryId: string | null;
  clubId: string;
  club: { id: string; name: string; shortName: string | null };
  photoUrl: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  membershipAnniversary: string | null;
  status: string;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  directoryOptIn: boolean;
  isDacMember: boolean;
  createdAt: string;
};

export function memberDto(row: MemberRow): MemberDto {
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    rotaryId: row.rotaryId,
    clubId: row.clubId,
    club: row.club,
    photoUrl: row.photoUrl,
    bio: row.bio,
    skills: row.skills,
    interests: row.interests,
    membershipAnniversary: row.membershipAnniversary
      ? row.membershipAnniversary.toISOString().slice(0, 10)
      : null,
    status: row.status,
    approvedById: row.approvedById,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    rejectionReason: row.rejectionReason,
    directoryOptIn: row.directoryOptIn,
    isDacMember: row.isDacMember,
    createdAt: row.createdAt.toISOString(),
  };
}

export type DirectoryEntryDto = {
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

export function directoryEntryDto(row: DirectoryEntryRow): DirectoryEntryDto {
  return {
    id: row.id,
    fullName: row.fullName,
    photoUrl: row.photoUrl,
    skills: row.skills,
    interests: row.interests,
    club: row.club,
  };
}

export type SkillTagDto = { id: string; label: string; kind: string };

export function skillTagDto(row: SkillTagRow): SkillTagDto {
  return { id: row.id, label: row.label, kind: row.kind };
}
