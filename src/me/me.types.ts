export type MemberProfileRow = {
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
  status: string;
  directoryOptIn: boolean;
  isDacMember: boolean;
  themePreference: string;
  qrToken: string;
  createdAt: Date;
};

export type MemberProfileUpdate = {
  fullName?: string;
  phone?: string | null;
  bio?: string | null;
  skills?: string[];
  interests?: string[];
  photoUrl?: string | null;
  rotaryId?: string | null;
  membershipAnniversary?: Date | null;
  themePreference?: string;
  directoryOptIn?: boolean;
};
