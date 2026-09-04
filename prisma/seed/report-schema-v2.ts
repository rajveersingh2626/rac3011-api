export interface ReportFieldSeed {
  section: string;
  fieldKey: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'link'
    | 'date'
    | 'boolean'
    | 'clubs';
  options?: unknown;
  required?: boolean;
  perActivity?: boolean;
  pointSourceKey?: string | null;
  helpText?: string;
}

const AVENUES = ['community', 'club', 'international', 'vocational', 'district', 'flagship'];
const AREAS_OF_FOCUS = [
  'Peacebuilding and conflict prevention',
  'Disease prevention and treatment',
  'Water, sanitation, and hygiene',
  'Maternal and child health',
  'Basic education and literacy',
  'Community economic development',
  'Environment',
];
const INITIATORS = ['rotaract', 'rotary', 'other'];

export const REPORT_SCHEMA_V2_FIELDS: ReportFieldSeed[] = [
  {
    section: 'Monthly activity log',
    fieldKey: 'activity_title',
    label: 'Activity title',
    type: 'text',
    required: true,
    perActivity: true,
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'activity_date',
    label: 'Date',
    type: 'date',
    required: true,
    perActivity: true,
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'avenue',
    label: 'Avenue',
    type: 'select',
    required: true,
    perActivity: true,
    options: { choices: AVENUES },
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'area_of_focus',
    label: 'Area of focus',
    type: 'select',
    required: true,
    perActivity: true,
    options: { choices: AREAS_OF_FOCUS },
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'initiated_by',
    label: 'Initiated by',
    type: 'select',
    required: true,
    perActivity: true,
    options: { choices: INITIATORS },
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'people_reached',
    label: 'People reached',
    type: 'number',
    perActivity: true,
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'members_participated',
    label: 'Members participated',
    type: 'number',
    required: true,
    perActivity: true,
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'collaborating_clubs',
    label: 'Collaborating clubs',
    type: 'clubs',
    perActivity: true,
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'is_physical',
    label: 'In-person activity',
    type: 'boolean',
    perActivity: true,
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'photo_links',
    label: 'Photo links',
    type: 'link',
    perActivity: true,
    options: { multiple: true },
  },
  {
    section: 'Monthly activity log',
    fieldKey: 'showcase_summary',
    label: 'Showcase summary',
    type: 'textarea',
    perActivity: true,
  },
  {
    section: 'Club',
    fieldKey: 'physical_meetings',
    label: 'Physical meetings held',
    type: 'number',
    required: true,
    pointSourceKey: 'physical_meetings',
  },
  {
    section: 'Club',
    fieldKey: 'virtual_meetings',
    label: 'Virtual meetings held',
    type: 'number',
    pointSourceKey: 'virtual_meetings',
  },
  {
    section: 'Club',
    fieldKey: 'new_members_inducted',
    label: 'New members inducted',
    type: 'number',
    pointSourceKey: 'new_members',
  },
  { section: 'Club', fieldKey: 'members_left', label: 'Members who left', type: 'number' },
  {
    section: 'Club',
    fieldKey: 'social_posts',
    label: 'Social media posts',
    type: 'number',
    pointSourceKey: 'social_posts',
  },
  { section: 'Notes', fieldKey: 'notes', label: 'Notes for the district', type: 'textarea' },
];
