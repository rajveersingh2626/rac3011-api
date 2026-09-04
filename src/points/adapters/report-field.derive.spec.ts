import { describe, expect, it } from 'vitest';
import type { ReportActivityValue } from './report-field.derive';
import {
  campsOrganised,
  deriveReportPointSources,
  flagshipContinued,
  internationalActivities,
  maxCollaborators,
  projectsInitiated,
  vocationalWorkshops,
} from './report-field.derive';

function activity(overrides: Partial<ReportActivityValue>): ReportActivityValue {
  return {
    activity_title: 'Weekly meeting',
    activity_date: '2026-08-10',
    avenue: 'club',
    area_of_focus: 'Club Service',
    initiated_by: 'rotaract',
    members_participated: 10,
    ...overrides,
  };
}

describe('campsOrganised', () => {
  it('counts community activities whose title or focus mentions health/blood/polio', () => {
    const activities = [
      activity({ avenue: 'community', activity_title: 'Blood donation camp' }),
      activity({
        avenue: 'community',
        activity_title: 'Tree plantation',
        area_of_focus: 'Environment',
      }),
      activity({ avenue: 'community', activity_title: 'Health check-up camp' }),
      activity({ avenue: 'vocational', activity_title: 'Health check-up camp' }),
    ];
    expect(campsOrganised(activities)).toBe(2);
  });
});

describe('projectsInitiated', () => {
  it('counts activities initiated by rotaract', () => {
    const activities = [
      activity({ initiated_by: 'rotaract' }),
      activity({ initiated_by: 'rotary' }),
      activity({ initiated_by: 'other' }),
    ];
    expect(projectsInitiated(activities)).toBe(1);
  });
});

describe('vocationalWorkshops', () => {
  it('counts vocational-avenue activities', () => {
    const activities = [activity({ avenue: 'vocational' }), activity({ avenue: 'club' })];
    expect(vocationalWorkshops(activities)).toBe(1);
  });
});

describe('flagshipContinued', () => {
  it('is true when any activity has avenue flagship', () => {
    expect(flagshipContinued([activity({ avenue: 'flagship' })])).toBe(true);
    expect(flagshipContinued([activity({ avenue: 'club' })])).toBe(false);
    expect(flagshipContinued([])).toBe(false);
  });
});

describe('internationalActivities', () => {
  it('counts international-avenue activities', () => {
    const activities = [
      activity({ avenue: 'international' }),
      activity({ avenue: 'international' }),
      activity({ avenue: 'club' }),
    ];
    expect(internationalActivities(activities)).toBe(2);
  });
});

describe('maxCollaborators', () => {
  it('returns the largest collaborating_clubs array length, 0 when none', () => {
    expect(maxCollaborators([])).toBe(0);
    expect(
      maxCollaborators([
        activity({ collaborating_clubs: ['A', 'B'] }),
        activity({ collaborating_clubs: ['A', 'B', 'C', 'D'] }),
        activity({}),
      ]),
    ).toBe(4);
  });
});

describe('deriveReportPointSources', () => {
  it('combines activity-derived and direct club-field sources, including filedOnTime', () => {
    const values = {
      activities: [
        activity({ avenue: 'flagship' }),
        activity({
          avenue: 'community',
          activity_title: 'Blood donation camp',
          collaborating_clubs: ['A', 'B', 'C'],
        }),
      ],
      physical_meetings: 3,
      virtual_meetings: 1,
      new_members_inducted: 2,
      social_posts: 5,
    };
    const derived = deriveReportPointSources(values, true);
    expect(derived['report_field:physical_meetings']).toBe(3);
    expect(derived['report_field:virtual_meetings']).toBe(1);
    expect(derived['report_field:new_members']).toBe(2);
    expect(derived['report_field:social_posts']).toBe(5);
    expect(derived['report_field:flagship_continued']).toBe(1);
    expect(derived['report_field:camps_organised']).toBe(1);
    expect(derived['project_collaboration:max_collaborators']).toBe(3);
    expect(derived['report_field:filed_on_time']).toBe(1);
  });

  it('defaults missing club fields to 0 and filedOnTime false/null to 0', () => {
    const derived = deriveReportPointSources({ activities: [] }, null);
    expect(derived['report_field:physical_meetings']).toBe(0);
    expect(derived['report_field:filed_on_time']).toBe(0);
  });
});
