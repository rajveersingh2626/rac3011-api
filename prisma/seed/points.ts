export const POINT_CATEGORIES: [string, string][] = [
  ['community_services', 'Community Services'],
  ['vocational_services', 'Vocational Services / Professional Development'],
  ['international_services', 'International Services'],
  ['club_services', 'Club Services'],
  ['flagship', 'Flagship Projects'],
  ['club_district', 'Club & District'],
  ['reporting', 'Reporting to District'],
  ['drr_visit', 'DRR Official Visit'],
  ['membership', 'Membership Growth & Retention'],
  ['rotary_international', 'Rotary International'],
  ['public_image', 'Public Image'],
  ['dues', 'District Dues'],
  ['mdio', 'MDIOs Presence'],
  ['judged', 'Officer judgement'],
];

export const JUDGED_CATEGORY_ORDER = 99;

export type Tier = { min: number; max: number | null; points: number };
export type RuleSeed = {
  key: string;
  label: string;
  category: string;
  ruleType: 'flat' | 'per_unit' | 'tiered' | 'penalty';
  period: 'monthly' | 'yearly' | 'once';
  sourceType: 'report_field' | 'club_fact' | 'event_attendance' | 'project_collaboration' | 'ride_hosting' | 'club_events';
  sourceKey: string;
  points?: number;
  perUnitCap?: number;
  tiers?: Tier[];
};

const r = (
  key: string,
  label: string,
  category: RuleSeed['category'],
  ruleType: RuleSeed['ruleType'],
  period: RuleSeed['period'],
  source: string,
  extra: Partial<RuleSeed>,
): RuleSeed => {
  const [sourceType, sourceKey] = source.split(':') as [RuleSeed['sourceType'], string];
  return { key, label, category, ruleType, period, sourceType, sourceKey, ...extra };
};

export const POINT_RULES_2026: RuleSeed[] = [
  r('cs_project_initiated', 'Community project initiated', 'community_services', 'flat', 'monthly', 'report_field:projects_initiated', { points: 20 }),
  r('cs_camp_organised', 'Camp organised', 'community_services', 'per_unit', 'monthly', 'report_field:camps_organised', { points: 30 }),
  r('vs_workshops', 'Vocational workshops', 'vocational_services', 'tiered', 'monthly', 'report_field:vocational_workshops', {
    tiers: [
      { min: 1, max: 5, points: 30 },
      { min: 5, max: null, points: 60 },
    ],
  }),
  r('vs_vocational_centre', 'Vocational centre set up', 'vocational_services', 'flat', 'once', 'club_fact:vocational_centre', { points: 100 }),
  r('is_international_activity', 'International activity', 'international_services', 'per_unit', 'monthly', 'report_field:international_activities', { points: 30 }),
  r('is_ride_hosting_days', 'RIDE days hosted', 'international_services', 'per_unit', 'yearly', 'ride_hosting:days_hosted', { points: 40 }),
  r('is_ride_visiting_days', 'RIDE days visited', 'international_services', 'per_unit', 'yearly', 'ride_hosting:days_visited', { points: 30 }),
  r('is_ride_members_sent', 'RIDE members sent', 'international_services', 'per_unit', 'yearly', 'ride_hosting:members_sent', { points: 30 }),
  r('is_ride_both', 'RIDE hosted and sent', 'international_services', 'flat', 'yearly', 'ride_hosting:hosted_and_sent', { points: 50 }),
  r('is_sister_club', 'Sister club agreement', 'international_services', 'flat', 'once', 'club_fact:sister_club_signed', { points: 50 }),
  r('club_physical_meetings', 'Physical club meetings', 'club_services', 'per_unit', 'monthly', 'report_field:physical_meetings', { points: 20, perUnitCap: 4 }),
  r('club_virtual_meetings', 'Virtual club meetings', 'club_services', 'per_unit', 'monthly', 'report_field:virtual_meetings', { points: 10, perUnitCap: 4 }),
  r('club_events_logged', 'Club events logged', 'club_services', 'per_unit', 'monthly', 'club_events:count', { points: 10, perUnitCap: 4 }),
  r('flagship_continued', 'Flagship project continued', 'flagship', 'flat', 'monthly', 'report_field:flagship_continued', { points: 50 }),
  r('cd_attendance', 'District event attendance', 'club_district', 'tiered', 'monthly', 'event_attendance:ratio', {
    tiers: [
      { min: 25, max: 50, points: 10 },
      { min: 50, max: 75, points: 20 },
      { min: 75, max: 100, points: 30 },
      { min: 100, max: null, points: 50 },
    ],
  }),
  r('cd_collaboration', 'Inter-club collaboration', 'club_district', 'tiered', 'monthly', 'project_collaboration:max_collaborators', {
    tiers: [
      { min: 2, max: 6, points: 20 },
      { min: 6, max: 11, points: 40 },
      { min: 11, max: null, points: 60 },
    ],
  }),
  r('rep_on_time', 'Report filed on time', 'reporting', 'flat', 'monthly', 'report_field:filed_on_time', { points: 20 }),
  r('drr_visit', 'DRR official visit completed', 'drr_visit', 'flat', 'once', 'club_fact:drr_visit_completed', { points: 40 }),
  r('mem_new_members', 'New members inducted', 'membership', 'per_unit', 'monthly', 'report_field:new_members', { points: 10 }),
  r('mem_retention', 'Member retention', 'membership', 'tiered', 'yearly', 'club_fact:retention_ratio', {
    tiers: [
      { min: 50, max: 75, points: 20 },
      { min: 75, max: 100, points: 30 },
      { min: 100, max: null, points: 70 },
    ],
  }),
  r('mem_skills_adoption', 'Skills adoption', 'membership', 'tiered', 'yearly', 'club_fact:skills_adoption_ratio', { tiers: [{ min: 50, max: null, points: 60 }] }),
  r('ri_citation', 'Rotary Citation completed', 'rotary_international', 'flat', 'once', 'club_fact:ri_citation_completed', { points: 100 }),
  r('ri_phf', 'Paul Harris Fellows', 'rotary_international', 'per_unit', 'yearly', 'club_fact:paul_harris_fellows', { points: 250 }),
  r('ri_dual_members', 'Dual members', 'rotary_international', 'per_unit', 'yearly', 'club_fact:dual_members', { points: 50 }),
  r('pi_social_handles', 'Active social handles', 'public_image', 'per_unit', 'monthly', 'club_fact:active_social_handles', { points: 10, perUnitCap: 5 }),
  r('pi_social_posts', 'Social media posts', 'public_image', 'tiered', 'monthly', 'report_field:social_posts', {
    tiers: [
      { min: 4, max: 8, points: 10 },
      { min: 8, max: null, points: 20 },
    ],
  }),
  r('pi_merchandise', 'Club merchandise', 'public_image', 'flat', 'once', 'club_fact:club_merchandise', { points: 20 }),
  r('dues_timing', 'District dues timing', 'dues', 'tiered', 'yearly', 'club_fact:dues_paid_bracket', {
    tiers: [
      { min: 0, max: 1, points: 50 },
      { min: 1, max: 2, points: 30 },
      { min: 2, max: null, points: -500 },
    ],
  }),
  r('mdio_committee', 'MDIO committee members', 'mdio', 'per_unit', 'yearly', 'club_fact:mdio_committee_members', { points: 50 }),
  r('mdio_events', 'MDIO events attended', 'mdio', 'per_unit', 'yearly', 'club_fact:mdio_events_attended', { points: 100 }),
];
