export type ReportAvenue =
  'community' | 'club' | 'international' | 'vocational' | 'district' | 'flagship';
export type ReportInitiator = 'rotaract' | 'rotary' | 'other';

export interface ReportActivityValue {
  activity_title: string;
  activity_date: string;
  avenue: ReportAvenue;
  area_of_focus: string;
  initiated_by: ReportInitiator;
  people_reached?: number;
  members_participated: number;
  collaborating_clubs?: string[];
  is_physical?: boolean;
  photo_links?: string[];
  showcase_summary?: string;
}

export interface ReportClubFieldValues {
  physical_meetings?: number;
  virtual_meetings?: number;
  new_members_inducted?: number;
  members_left?: number;
  social_posts?: number;
}

export interface ReportValuesForDerivation {
  activities: ReportActivityValue[];
  physical_meetings?: number;
  virtual_meetings?: number;
  new_members_inducted?: number;
  members_left?: number;
  social_posts?: number;
}

const CAMP_KEYWORDS = /health|blood|polio/i;

export function campsOrganised(activities: ReportActivityValue[]): number {
  return activities.filter(
    (a) =>
      a.avenue === 'community' &&
      (CAMP_KEYWORDS.test(a.activity_title) || CAMP_KEYWORDS.test(a.area_of_focus)),
  ).length;
}

export function projectsInitiated(activities: ReportActivityValue[]): number {
  return activities.filter((a) => a.initiated_by === 'rotaract').length;
}

export function vocationalWorkshops(activities: ReportActivityValue[]): number {
  return activities.filter((a) => a.avenue === 'vocational').length;
}

export function flagshipContinued(activities: ReportActivityValue[]): boolean {
  return activities.some((a) => a.avenue === 'flagship');
}

export function internationalActivities(activities: ReportActivityValue[]): number {
  return activities.filter((a) => a.avenue === 'international').length;
}

export function maxCollaborators(activities: ReportActivityValue[]): number {
  return activities.reduce((max, a) => Math.max(max, a.collaborating_clubs?.length ?? 0), 0);
}

export interface DerivedReportPointSources {
  'report_field:camps_organised': number;
  'report_field:projects_initiated': number;
  'report_field:vocational_workshops': number;
  'report_field:flagship_continued': number;
  'report_field:international_activities': number;
  'report_field:physical_meetings': number;
  'report_field:virtual_meetings': number;
  'report_field:new_members': number;
  'report_field:social_posts': number;
  'report_field:filed_on_time': number;
  'project_collaboration:max_collaborators': number;
}

export function deriveReportPointSources(
  values: ReportValuesForDerivation,
  filedOnTime: boolean | null,
): DerivedReportPointSources {
  const activities = values.activities ?? [];
  return {
    'report_field:camps_organised': campsOrganised(activities),
    'report_field:projects_initiated': projectsInitiated(activities),
    'report_field:vocational_workshops': vocationalWorkshops(activities),
    'report_field:flagship_continued': flagshipContinued(activities) ? 1 : 0,
    'report_field:international_activities': internationalActivities(activities),
    'report_field:physical_meetings': values.physical_meetings ?? 0,
    'report_field:virtual_meetings': values.virtual_meetings ?? 0,
    'report_field:new_members': values.new_members_inducted ?? 0,
    'report_field:social_posts': values.social_posts ?? 0,
    'report_field:filed_on_time': filedOnTime ? 1 : 0,
    'project_collaboration:max_collaborators': maxCollaborators(activities),
  };
}
