import type { PermissionKey } from './permission-keys';

export type ScopeKind = 'none' | 'club' | 'zone' | 'project';
export type Scope = { type: ScopeKind; id?: string };
export type ProjectKey = 'mission3011' | 'drishti' | 'rcl' | 'careerbridge' | 'ride';

export type ResolvedAccess = {
  userId: string;
  isSuperAdmin: boolean;
  roles: { roleKey: string; scope: Scope }[];
  grants: Partial<Record<PermissionKey, Scope[]>>;
};

export type ScopeFilter = { all: true } | { clubIds: string[] } | { projectKeys: ProjectKey[] };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
};

export type RequestContext = {
  user: SessionUser;
  sessionId: string;
  access: ResolvedAccess;
};
