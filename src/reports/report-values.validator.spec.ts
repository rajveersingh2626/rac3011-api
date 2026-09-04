import { describe, expect, it } from 'vitest';
import { collectClubIdsInValues, validateReportValues } from './report-values.validator';
import type { ReportFieldRow } from './reports.types';

function field(overrides: Partial<ReportFieldRow>): ReportFieldRow {
  return {
    id: 'f1',
    schemaId: 's1',
    section: 'Club',
    fieldKey: 'physical_meetings',
    label: 'Physical meetings',
    type: 'number',
    options: null,
    required: true,
    order: 0,
    helpText: null,
    perActivity: false,
    pointSourceKey: 'physical_meetings',
    ...overrides,
  };
}

const CLUB_FIELDS: ReportFieldRow[] = [
  field({ fieldKey: 'physical_meetings', type: 'number', required: true }),
  field({ fieldKey: 'social_posts', type: 'number', required: false, order: 1 }),
];

const ACTIVITY_FIELDS: ReportFieldRow[] = [
  field({
    fieldKey: 'activity_title',
    label: 'Activity title',
    type: 'text',
    required: true,
    perActivity: true,
    order: 0,
  }),
  field({
    fieldKey: 'avenue',
    label: 'Avenue',
    type: 'select',
    required: true,
    perActivity: true,
    order: 1,
    options: {
      choices: ['community', 'club', 'international', 'vocational', 'district', 'flagship'],
    },
  }),
  field({
    fieldKey: 'collaborating_clubs',
    label: 'Collaborating clubs',
    type: 'clubs',
    required: false,
    perActivity: true,
    order: 2,
  }),
];

const ALL_FIELDS = [...CLUB_FIELDS, ...ACTIVITY_FIELDS];
const VALID_CLUBS = new Set(['CLUB-A', 'CLUB-B']);

describe('validateReportValues', () => {
  it('accepts a well-formed payload', () => {
    const result = validateReportValues(
      ALL_FIELDS,
      {
        physical_meetings: 3,
        social_posts: 5,
        activities: [
          { activity_title: 'Meeting', avenue: 'club', collaborating_clubs: ['CLUB-A'] },
        ],
      },
      VALID_CLUBS,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a missing required top-level field', () => {
    const result = validateReportValues(ALL_FIELDS, { activities: [] }, VALID_CLUBS);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'physical_meetings')).toBe(true);
  });

  it('rejects a clubs-type field value that is not a real club id', () => {
    const result = validateReportValues(
      ALL_FIELDS,
      {
        physical_meetings: 1,
        activities: [
          {
            activity_title: 'Meeting',
            avenue: 'club',
            collaborating_clubs: ['CLUB-A', 'GHOST-CLUB'],
          },
        ],
      },
      VALID_CLUBS,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('GHOST-CLUB'))).toBe(true);
  });

  it('rejects an unknown select choice and an unknown top-level key', () => {
    const result = validateReportValues(
      ALL_FIELDS,
      {
        physical_meetings: 1,
        bogus_field: 'x',
        activities: [{ activity_title: 'Meeting', avenue: 'not-a-real-avenue' }],
      },
      VALID_CLUBS,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'bogus_field')).toBe(true);
    expect(result.errors.some((e) => e.path === 'activities[0].avenue')).toBe(true);
  });

  it('rejects activities that is not an array', () => {
    const result = validateReportValues(
      ALL_FIELDS,
      { physical_meetings: 1, activities: 'nope' },
      VALID_CLUBS,
    );
    expect(result.valid).toBe(false);
  });
});

describe('collectClubIdsInValues', () => {
  it('collects club ids referenced by clubs-type fields across activities', () => {
    const ids = collectClubIdsInValues(ALL_FIELDS, {
      physical_meetings: 1,
      activities: [
        { activity_title: 'A', avenue: 'club', collaborating_clubs: ['CLUB-A'] },
        { activity_title: 'B', avenue: 'club', collaborating_clubs: ['CLUB-B', 'CLUB-A'] },
      ],
    });
    expect(new Set(ids)).toEqual(new Set(['CLUB-A', 'CLUB-B']));
  });
});
