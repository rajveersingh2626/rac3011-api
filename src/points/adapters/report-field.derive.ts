export type ReportAvenue =
  | 'community'
  | 'club'
  | 'international'
  | 'vocational'
  | 'district'
  | 'flagship'
  | string;

export type ReportInitiator =
  | 'rotaract'
  | 'rotary'
  | 'other'
  | 'Your Club'
  | string;

export interface ReportActivityValue {
  activity_title?: string;
  activity_date?: string;
  avenue?: ReportAvenue;
  area_of_focus?: string;
  initiated_by?: ReportInitiator;
  people_reached?: number;
  members_participated?: number;
  collaborating_clubs?: string[];
  is_physical?: boolean;
  photo_links?: string[];
  showcase_summary?: string;
  social_posts?: string;
}

export interface ReportClubFieldValues {
  physical_meetings?: number;
  virtual_meetings?: number;
  new_members_inducted?: number;
  members_left?: number;
  social_posts?: number | string;
}

export interface ReportValuesForDerivation {
  activities?: ReportActivityValue[];
  physical_meetings?: number;
  virtual_meetings?: number;
  new_members_inducted?: number;
  members_left?: number;
  social_posts?: number | string;
}

const CAMP_KEYWORDS = /health|blood|polio|camp|medical|checkup|disease/i;

function norm(str?: string | null): string {
  return (str ?? '').trim().toLowerCase();
}

export function campsOrganised(activities: ReportActivityValue[]): number {
  return activities.filter((a) => {
    const avenue = norm(a.avenue);
    const title = a.activity_title ?? '';
    const aof = a.area_of_focus ?? '';
    const isCommunity = avenue.includes('community') || avenue === '';
    const matchesKeyword = CAMP_KEYWORDS.test(title) || CAMP_KEYWORDS.test(aof);
    return isCommunity && matchesKeyword;
  }).length;
}

export function projectsInitiated(activities: ReportActivityValue[]): number {
  return activities.filter((a) => {
    const init = norm(a.initiated_by);
    return (
      init === 'rotaract' ||
      init === 'your club' ||
      init.includes('your club') ||
      init.includes('co-hosted') ||
      init.includes('collaborated')
    );
  }).length;
}

export function vocationalWorkshops(activities: ReportActivityValue[]): number {
  return activities.filter((a) => norm(a.avenue).includes('vocational')).length;
}

export function flagshipContinued(activities: ReportActivityValue[]): boolean {
  return activities.some((a) => norm(a.avenue).includes('flagship'));
}

export function internationalActivities(activities: ReportActivityValue[]): number {
  return activities.filter((a) => norm(a.avenue).includes('international')).length;
}

export function maxCollaborators(activities: ReportActivityValue[]): number {
  return activities.reduce((max, a) => Math.max(max, a.collaborating_clubs?.length ?? 0), 0);
}

export function socialPostsCount(values: ReportValuesForDerivation): number {
  if (typeof values.social_posts === 'number') {
    return values.social_posts;
  }
  if (typeof values.social_posts === 'string' && values.social_posts.trim() !== '') {
    const parsed = Number(values.social_posts);
    if (!isNaN(parsed)) return parsed;
    // If it's a single string URL at the root
    return 1;
  }
  const activities = values.activities ?? [];
  // Count how many activities have a non-empty social_posts link/text
  const activityLinks = activities.filter((a) => {
    const val = (a as unknown as Record<string, unknown>).social_posts;
    return typeof val === 'string' && val.trim().length > 0;
  }).length;
  return activityLinks;
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
    'report_field:physical_meetings': Number(values.physical_meetings) || 0,
    'report_field:virtual_meetings': Number(values.virtual_meetings) || 0,
    'report_field:new_members': Number(values.new_members_inducted) || 0,
    'report_field:social_posts': socialPostsCount(values),
    'report_field:filed_on_time': filedOnTime ? 1 : 0,
    'project_collaboration:max_collaborators': maxCollaborators(activities),
  };
}
