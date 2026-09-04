import type { MemberProfileRow } from './me.types';

export type MemberProfileDto = {
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
  membershipAnniversary: string | null;
  status: string;
  directoryOptIn: boolean;
  isDacMember: boolean;
  themePreference: string;
};

export function memberProfileDto(row: MemberProfileRow): MemberProfileDto {
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    rotaryId: row.rotaryId,
    clubId: row.clubId,
    photoUrl: row.photoUrl,
    bio: row.bio,
    skills: row.skills,
    interests: row.interests,
    membershipAnniversary: row.membershipAnniversary
      ? row.membershipAnniversary.toISOString().slice(0, 10)
      : null,
    status: row.status,
    directoryOptIn: row.directoryOptIn,
    isDacMember: row.isDacMember,
    themePreference: row.themePreference,
  };
}
