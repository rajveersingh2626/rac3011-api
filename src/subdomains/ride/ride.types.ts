export type DelegationStatusKind = 'planned' | 'confirmed' | 'completed' | 'cancelled';
export type GalleryItemKind = 'photo' | 'video';

export type RideClubRef = { id: string; name: string; shortName: string | null };

export type SupportClubListFilter = { ryYear?: number; clubId?: string };

export type SupportClubRow = {
  id: string;
  ryYear: number;
  clubId: string;
  club: RideClubRef;
  capacityDelegates: number;
  homestayAvailable: boolean;
  preferredMonths: number[];
  contactMemberId: string | null;
  contactPhone: string;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SupportClubUpsert = {
  clubId: string;
  ryYear: number;
  capacityDelegates: number;
  homestayAvailable: boolean;
  preferredMonths: number[];
  contactMemberId: string | null;
  contactPhone: string;
  notes: string | null;
  createdById: string;
};

export type DelegationParticipantRow = {
  id: string;
  fullName: string;
  email: string;
  rotaryId: string | null;
  homeDistrict: string;
  status: string;
  approvalStatus: string;
  hostClubId: string | null;
  hostFamilyName: string | null;
  hostFamilyPhone: string | null;
  hostAddress: string | null;
};

export type HostAssignmentInput = {
  clubId: string;
  daysHosted: number;
  membersSent?: number;
  hostFamilyName?: string;
  hostFamilyPhone?: string;
  hostAddress?: string;
};

export type ApprovedHostClubRow = {
  id: string;
  clubId: string;
  club: RideClubRef;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  zone?: string;
  capacityDelegates: number;
  homestayAvailable: boolean;
  proposalDriveUrl?: string | null;
  notes?: string | null;
  status: 'approved';
  submittedAt: Date;
};

export type DelegationHostRow = {
  id: string;
  clubId: string;
  club: RideClubRef;
  daysHosted: number;
  membersSent: number;
  assignedById: string;
};

export type DelegationRow = {
  id: string;
  ryYear: number;
  visitingDistrict: string;
  country: string;
  startsAt: Date;
  endsAt: Date;
  headcount: number;
  contactName: string;
  contactEmail: string | null;
  status: DelegationStatusKind;
  hosts: DelegationHostRow[];
  participants?: DelegationParticipantRow[];
  approvedParticipantsCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DelegationListFilter = {
  status?: DelegationStatusKind;
  ryYear?: number;
  approvedOnly?: boolean;
};

export type DelegationCreate = {
  ryYear: number;
  visitingDistrict: string;
  country: string;
  startsAt: Date;
  endsAt: Date;
  headcount: number;
  contactName: string;
  contactEmail: string | null;
  status: DelegationStatusKind;
};

export type DelegationUpdate = Partial<{
  visitingDistrict: string;
  country: string;
  startsAt: Date;
  endsAt: Date;
  headcount: number;
  contactName: string;
  contactEmail: string | null;
  status: DelegationStatusKind;
}>;

export type GalleryItemListFilter = { year?: number };

export type GalleryItemRow = {
  id: string;
  year: number;
  url: string;
  kind: GalleryItemKind;
  caption: string | null;
  headingLeft: string | null;
  headingRight: string | null;
  order: number;
  createdAt: Date;
};

export type GalleryItemCreate = {
  year: number;
  url: string;
  kind: GalleryItemKind;
  caption: string | null;
  headingLeft: string | null;
  headingRight: string | null;
  order: number;
};

export type RideDashboard = {
  delegationsThisRy: number;
  hostClubsThisRy: number;
  updatedAt: string;
};
