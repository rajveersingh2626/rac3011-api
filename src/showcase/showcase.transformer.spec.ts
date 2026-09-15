import { describe, expect, it } from 'vitest';
import { publicProjectDetailDto, publicProjectSummaryDto } from './showcase.transformer';
import { projectDto } from './showcase-admin.transformer';
import type { PublishedProjectRow, ProjectRow } from './showcase.types';

describe('showcase transformers', () => {
  const mockPublishedRow: PublishedProjectRow = {
    id: 'proj_1',
    slug: 'peace-rally',
    title: 'Peace Rally',
    publishedTitle: null,
    avenueOfService: 'Community Services',
    areasOfFocus: ['Peacebuilding and Conflict Prevention', 'Basic Education and Literacy'],
    category: 'Community Services',
    summary: 'A rally for peace',
    publishedSummary: null,
    body: 'Long story text',
    publishedBody: null,
    photos: [],
    date: new Date('2026-08-15T00:00:00.000Z'),
    publishedAt: new Date('2026-08-16T00:00:00.000Z'),
    beneficiaries: 100,
    clubs: [
      {
        role: 'lead',
        club: {
          id: 'club_1',
          name: 'Rotaract Club of Central',
          shortName: 'RC Central',
          slug: 'rc-central',
          zoneRef: { name: 'Zone 1' },
        },
      },
    ],
  };

  const mockAdminRow: ProjectRow = {
    id: 'proj_2',
    slug: 'health-camp',
    title: 'Health Camp',
    avenueOfService: 'International Services',
    areasOfFocus: ['Disease Prevention and Treatment'],
    category: 'International Services',
    summary: 'Medical camp',
    body: 'Comprehensive checkups',
    photos: [],
    date: new Date('2026-08-10T00:00:00.000Z'),
    beneficiaries: 200,
    submittedById: 'user_1',
    status: 'SUBMITTED',
    consentConfirmed: true,
    submittedAt: new Date('2026-08-10T00:00:00.000Z'),
    publishedTitle: null,
    publishedSummary: null,
    publishedBody: null,
    editorNotes: null,
    rejectionReason: null,
    publishedAt: null,
    publishedById: null,
    clubs: [],
  };

  it('publicProjectSummaryDto maps avenueOfService and areasOfFocus', () => {
    const summary = publicProjectSummaryDto(mockPublishedRow);
    expect(summary.avenueOfService).toBe('Community Services');
    expect(summary.areasOfFocus).toEqual(['Peacebuilding and Conflict Prevention', 'Basic Education and Literacy']);
    expect(summary.category).toBe('Community Services');
  });

  it('publicProjectDetailDto maps avenueOfService and areasOfFocus', () => {
    const detail = publicProjectDetailDto(mockPublishedRow);
    expect(detail.avenueOfService).toBe('Community Services');
    expect(detail.areasOfFocus).toEqual(['Peacebuilding and Conflict Prevention', 'Basic Education and Literacy']);
    expect(detail.body).toBe('Long story text');
  });

  it('projectDto maps avenueOfService and areasOfFocus', () => {
    const adminDetail = projectDto(mockAdminRow);
    expect(adminDetail.avenueOfService).toBe('International Services');
    expect(adminDetail.areasOfFocus).toEqual(['Disease Prevention and Treatment']);
  });

  it('falls back to category when avenueOfService is null', () => {
    const fallbackRow: PublishedProjectRow = {
      ...mockPublishedRow,
      avenueOfService: null,
      category: 'Vocational Services',
      areasOfFocus: [],
    };
    const summary = publicProjectSummaryDto(fallbackRow);
    expect(summary.avenueOfService).toBeNull();
    expect(summary.category).toBe('Vocational Services');
    expect(summary.areasOfFocus).toEqual(['Vocational Services']);
  });
});
