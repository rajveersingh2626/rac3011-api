export type DrishtiStageKind = 'screened' | 'scheduled' | 'operated' | 'followup' | 'closed';

export type SurgeryRow = {
  id: string;
  hospital: string;
  operatedOn: Date;
  outcome: string | null;
  followupOn: Date | null;
};

export type BeneficiaryRow = {
  id: string;
  clubId: string;
  club: { id: string; name: string; shortName: string | null };
  name: string;
  age: number | null;
  gender: string | null;
  phoneEncrypted: string | null;
  eye: string;
  screenedOn: Date;
  campLocation: string | null;
  stage: DrishtiStageKind;
  notes: string | null;
  createdById: string;
  surgeries: SurgeryRow[];
  createdAt: Date;
};

export type BeneficiaryListFilter = { stage?: DrishtiStageKind; clubId?: string };

export type SurgeryInput = {
  hospital: string;
  operatedOn: Date;
  outcome: string | null;
  followupOn: Date | null;
};

export type BeneficiaryCreate = {
  clubId: string;
  name: string;
  age: number | null;
  gender: string | null;
  phoneEncrypted: string | null;
  eye: string;
  screenedOn: Date;
  campLocation: string | null;
  notes: string | null;
  createdById: string;
};

export type BeneficiaryUpdate = Partial<{
  stage: DrishtiStageKind;
  notes: string | null;
}>;

export type DrishtiDashboard = {
  operatedCount: number;
  target: number;
  pipelineCounts: Record<DrishtiStageKind, number>;
  hospitals: { hospital: string; surgeries: number }[];
  perClub: { clubId: string; clubName: string; beneficiaries: number; operated: number }[];
  updatedAt: string;
};
