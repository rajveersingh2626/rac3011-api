import { PERMISSIONS, PROJECT_KEYS } from './permissions';

export type RoleSeed = {
  key: string;
  name: string;
  description: string;
  scopeType: 'none' | 'club' | 'zone' | 'project';
  permissions: string[];
};

const MEMBER = ['profile:edit', 'directory:view', 'showcase:submit', 'feedback:submit', 'clubs:view'];
const PRESIDENT = [
  ...MEMBER,
  'reports:submit',
  'members:approve',
  'members:import',
  'members:view',
  'effort:approve',
  'club_events:log',
  'announcements:send',
  'clubs:edit',
  'subdomain:ride:host_club_apply',
];
const ZRR = [...MEMBER, 'reports:review', 'members:view', 'clubs:view', 'showcase:publish', 'announcements:send'];
const DSC = [
  ...ZRR,
  'reports:score',
  'requests:manage',
  'members:approve',
  'members:import',
  'club_facts:edit',
  'effort:log',
  'effort:approve',
  'events:manage',
  'events:checkin',
  'feedback:review',
  'announcements:send_all',
  'resources:manage',
  'forms:manage',
  'comms:send',
  'public_content:manage',
  'audit:view',
  // The secretariat triages DRR presence requests on the DRR's behalf.
  'drr_calendar:manage',
];

const unique = (keys: string[]) => [...new Set(keys)];

export const ROLES: RoleSeed[] = [
  { key: 'member', name: 'Member', description: 'Approved club member', scopeType: 'club', permissions: unique(MEMBER) },
  { key: 'president', name: 'Club President', description: 'Club president', scopeType: 'club', permissions: unique(PRESIDENT) },
  { key: 'secretary', name: 'Club Secretary', description: 'Club secretary', scopeType: 'club', permissions: unique(PRESIDENT) },
  { key: 'zrr', name: 'Zonal Rotaract Representative', description: 'Zone-level reviewer', scopeType: 'zone', permissions: unique(ZRR) },
  { key: 'dsc', name: 'District Secretariat / Council', description: 'District officer', scopeType: 'none', permissions: unique(DSC) },
  {
    key: 'drr',
    name: 'District Rotaract Representative',
    description: 'District Rotaract Representative; owns the DRR calendar',
    scopeType: 'none',
    permissions: unique([...MEMBER, 'drr_calendar:manage']),
  },
  {
    key: 'editing_team',
    name: 'Editing Team',
    description: 'Website content editors',
    scopeType: 'none',
    permissions: ['content:edit', 'content:publish', 'public_content:manage'],
  },
  {
    key: 'event_checkin_staff',
    name: 'Event Check-In Staff',
    description: 'Event gate staff with access to scan attendee QR codes and manage event check-in records',
    scopeType: 'none',
    permissions: ['events:checkin', 'clubs:view', 'directory:view'],
  },
  { key: 'super_admin', name: 'Super Admin', description: 'Every permission', scopeType: 'none', permissions: Object.keys(PERMISSIONS) },
  {
    key: 'ride_admin',
    name: 'RIDE Youth Exchange Admin',
    description: 'Full administrative access to The RIDE (Delhi Meri Jaan) participant portal, form builder, and active logins',
    scopeType: 'none',
    permissions: [
      'subdomain:ride:manage',
      'ride:manage',
      'ride:delegates:manage',
      'events:checkin',
    ],
  },
  {
    key: 'participant',
    name: 'RIDE Participant / Delegate',
    description: 'Registered youth exchange participant with access to participant portal and forms',
    scopeType: 'none',
    permissions: ['profile:edit', 'directory:view', 'feedback:submit'],
  },
  ...PROJECT_KEYS.map((key) => ({
    key: `project_admin:${key}`,
    name: `Project Admin (${key})`,
    description: `Administers the ${key} subdomain`,
    scopeType: 'project' as const,
    permissions: key === 'ride' 
      ? ['subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage', 'forms:manage', 'comms:send', 'resources:manage', 'events:checkin']
      : [`subdomain:${key}:manage`, 'events:checkin'],
  })),
];
