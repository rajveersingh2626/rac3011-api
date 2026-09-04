export const SKILLS = [
  'Photography',
  'Video editing',
  'Graphic design',
  'Public speaking',
  'Event management',
  'Fundraising',
  'Social media',
  'Writing',
  'Web development',
  'First aid',
  'Teaching',
  'Music',
  'Anchoring',
  'Logistics',
];

export const INTERESTS = [
  'Community Service',
  'Club Service',
  'International Service',
  'Professional Development',
  'Public Image',
  'Environment',
  'Health',
  'Education',
];

export type BadgeSeed = { key: string; label: string; description: string; icon: string; triggerType: string; threshold: number | null };

export const BADGES: BadgeSeed[] = [
  { key: 'first_project', label: 'First Project', description: 'First showcase project published', icon: 'sparkles', triggerType: 'showcase.published', threshold: 1 },
  { key: 'events_10', label: 'Regular', description: 'Checked in to 10 district events', icon: 'calendar-check', triggerType: 'checkin.created', threshold: 10 },
  { key: 'events_25', label: 'Ever-present', description: 'Checked in to 25 district events', icon: 'calendar-heart', triggerType: 'checkin.created', threshold: 25 },
  { key: 'hours_25', label: '25 Hours', description: '25 approved service hours', icon: 'clock', triggerType: 'effort.approved', threshold: 25 },
  { key: 'hours_100', label: '100 Hours', description: '100 approved service hours', icon: 'award', triggerType: 'effort.approved', threshold: 100 },
  { key: 'service_1y', label: 'One Year', description: 'One year of membership', icon: 'cake', triggerType: 'badges.anniversaries', threshold: 1 },
  { key: 'service_3y', label: 'Three Years', description: 'Three years of membership', icon: 'medal', triggerType: 'badges.anniversaries', threshold: 3 },
  { key: 'phf', label: 'Paul Harris Fellow', description: 'Recognised as a Paul Harris Fellow', icon: 'star', triggerType: 'manual', threshold: null },
];
