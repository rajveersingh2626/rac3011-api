export type CampStatusKind = 'submitted' | 'approved' | 'rejected';

export type CampClubRef = { id: string; name: string; shortName: string | null };

export type CampRow = {
  id: string;
  leadClubId: string;
  leadClub: CampClubRef;
  date: Date;
  venue: string;
  city: string | null;
  unitsCollected: number;
  donorsRegistered: number | null;
  partnerBloodBank: string | null;
  photos: string[];
  status: CampStatusKind;
  submittedById: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  clubs: { club: CampClubRef }[];
  createdAt: Date;
};

export type CampListFilter = { status?: CampStatusKind; clubId?: string };

export type CampCreate = {
  leadClubId: string;
  date: Date;
  venue: string;
  city: string | null;
  unitsCollected: number;
  donorsRegistered: number | null;
  partnerBloodBank: string | null;
  photos: string[];
  submittedById: string;
  participatingClubIds: string[];
};

export type CampUpdate = Partial<{
  date: Date;
  venue: string;
  city: string | null;
  unitsCollected: number;
  donorsRegistered: number | null;
  partnerBloodBank: string | null;
  photos: string[];
  status: CampStatusKind;
  reviewedById: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}>;

export type ZoneUnits = { zoneId: string | null; zoneName: string; units: number };
export type ClubUnits = {
  clubId: string;
  clubName: string;
  campsApproved: number;
  unitsCollected: number;
};

export type Mission3011Dashboard = {
  totalUnits: number;
  target: number;
  byZone: ZoneUnits[];
  latestApprovedCamps: {
    id: string;
    date: string;
    venue: string;
    city: string | null;
    unitsCollected: number;
    leadClub: CampClubRef;
  }[];
  perClub: ClubUnits[];
  updatedAt: string;
};
