export type ListingTypeKind = 'job' | 'internship' | 'mentorship';
export type ListingModeKind = 'remote' | 'onsite' | 'hybrid';
export type ListingStatusKind =
  'pending_email' | 'pending' | 'verified' | 'filled' | 'expired' | 'rejected';

export type ListingRow = {
  id: string;
  title: string;
  company: string;
  type: ListingTypeKind;
  location: string;
  mode: string;
  stipend: string | null;
  description: string;
  applyUrl: string | null;
  contactEmail: string;
  postedByName: string;
  postedByEmail: string;
  rotaryAffiliation: string | null;
  status: ListingStatusKind;
  verifiedById: string | null;
  verifiedAt: Date | null;
  filledAt: Date | null;
  expiresAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ListingListFilter = { status?: ListingStatusKind; type?: ListingTypeKind };

export type ListingCreate = {
  title: string;
  company: string;
  type: ListingTypeKind;
  location: string;
  mode: ListingModeKind;
  stipend: string | null;
  description: string;
  applyUrl: string | null;
  contactEmail: string;
  postedByName: string;
  postedByEmail: string;
  rotaryAffiliation: string | null;
  verifyToken: string;
};

export type ListingReviewUpdate = {
  status: Exclude<ListingStatusKind, 'pending_email' | 'pending'>;
  verifiedById?: string | null;
  verifiedAt?: Date | null;
  filledAt?: Date | null;
  expiresAt?: Date | null;
  rejectionReason?: string | null;
};

export type CareerbridgeStats = {
  pending: number;
  verified: number;
  filled: number;
  rejected: number;
  expired: number;
  totalPosted: number;
};
