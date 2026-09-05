export type PublishedProjectRow = {
  id: string;
  slug: string | null;
  category: string;
  date: Date;
  beneficiaries: number | null;
  photos: string[];
  publishedTitle: string | null;
  publishedSummary: string | null;
  publishedBody: string | null;
  publishedAt: Date | null;
  clubs: {
    role: 'lead' | 'collaborator';
    club: { id: string; name: string; shortName: string | null; slug: string | null };
  }[];
};

export type PublishedProjectFilter = { category?: string; clubSlug?: string };

export type ProjectStatus = 'draft' | 'submitted' | 'published' | 'rejected';
export type ProjectClubRoleKind = 'lead' | 'collaborator';

export type ProjectClubRef = {
  role: ProjectClubRoleKind;
  club: { id: string; name: string; shortName: string | null; slug: string | null };
};

export type ProjectRow = {
  id: string;
  slug: string | null;
  title: string;
  category: string;
  date: Date;
  summary: string;
  body: string | null;
  beneficiaries: number | null;
  photos: string[];
  submittedById: string | null;
  status: ProjectStatus;
  consentConfirmed: boolean;
  submittedAt: Date | null;
  publishedTitle: string | null;
  publishedSummary: string | null;
  publishedBody: string | null;
  editorNotes: string | null;
  rejectionReason: string | null;
  publishedAt: Date | null;
  publishedById: string | null;
  clubs: ProjectClubRef[];
};

export type ProjectListFilter = { status?: ProjectStatus; clubId?: string; category?: string };
