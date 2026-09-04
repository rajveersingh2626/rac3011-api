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
  'public_content:manage',
  'audit:view',
];

const unique = (keys: string[]) => [...new Set(keys)];

export const ROLES: RoleSeed[] = [
  { key: 'member', name: 'Member', description: 'Approved club member', scopeType: 'club', permissions: unique(MEMBER) },
  { key: 'president', name: 'Club President', description: 'Club president', scopeType: 'club', permissions: unique(PRESIDENT) },
  { key: 'secretary', name: 'Club Secretary', description: 'Club secretary', scopeType: 'club', permissions: unique(PRESIDENT) },
  { key: 'zrr', name: 'Zonal Rotaract Representative', description: 'Zone-level reviewer', scopeType: 'zone', permissions: unique(ZRR) },
  { key: 'dsc', name: 'District Secretariat / Council', description: 'District officer', scopeType: 'none', permissions: unique(DSC) },
  {
    key: 'editing_team',
    name: 'Editing Team',
    description: 'Website content editors',
    scopeType: 'none',
    permissions: ['content:edit', 'content:publish', 'public_content:manage'],
  },
  { key: 'super_admin', name: 'Super Admin', description: 'Every permission', scopeType: 'none', permissions: Object.keys(PERMISSIONS) },
  ...PROJECT_KEYS.map((key) => ({
    key: `project_admin:${key}`,
    name: `Project Admin (${key})`,
    description: `Administers the ${key} subdomain`,
    scopeType: 'project' as const,
    permissions: [`subdomain:${key}:manage`, 'events:checkin'],
  })),
];
