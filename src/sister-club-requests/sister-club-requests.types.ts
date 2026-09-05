export type SisterClubRequestRow = {
  id: string;
  clubId: string;
  partnerClubName: string;
  partnerDistrict: string;
  country: string;
  contactName: string;
  contactEmail: string;
  status: string;
  signedOn: Date | null;
  submittedById: string | null;
  createdAt: Date;
};
