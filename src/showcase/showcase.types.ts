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
