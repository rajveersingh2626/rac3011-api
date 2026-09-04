import { BadRequestException } from '@nestjs/common';
import type { PermissionKey } from '../common/types/permission-keys';
import type { ProjectKey } from '../common/types/access';
import type { StorageTier } from './storage.port';

export type UploadOwnership = 'own_member_row' | 'own_club' | 'district' | 'project';

export type UploadTarget = {
  tier: StorageTier;
  permissions: PermissionKey[];
  ownership: UploadOwnership;
  projectKey?: ProjectKey;
};

const PUBLIC_CONTENT: PermissionKey[] = ['public_content:manage', 'content:edit'];

export const UPLOAD_TARGETS = {
  member_photo: { tier: 'dynamic', permissions: ['profile:edit'], ownership: 'own_member_row' },
  club_logo: { tier: 'permanent', permissions: ['clubs:edit'], ownership: 'own_club' },
  project_photo: { tier: 'dynamic', permissions: ['showcase:submit'], ownership: 'own_club' },
  event_photo: {
    tier: 'dynamic',
    permissions: ['events:manage', 'club_events:log'],
    ownership: 'own_club',
  },
  camp_photo: {
    tier: 'dynamic',
    permissions: ['subdomain:mission3011:manage', 'club_events:log'],
    ownership: 'own_club',
  },
  ride_gallery: {
    tier: 'dynamic',
    permissions: ['subdomain:ride:manage'],
    ownership: 'project',
    projectKey: 'ride',
  },
  partner_logo: { tier: 'permanent', permissions: PUBLIC_CONTENT, ownership: 'district' },
  past_drr_photo: { tier: 'permanent', permissions: PUBLIC_CONTENT, ownership: 'district' },
  district_team_photo: { tier: 'permanent', permissions: PUBLIC_CONTENT, ownership: 'district' },
  publication_cover: { tier: 'permanent', permissions: PUBLIC_CONTENT, ownership: 'district' },
  achievement_certificate: {
    tier: 'permanent',
    permissions: PUBLIC_CONTENT,
    ownership: 'district',
  },
  content_block: { tier: 'permanent', permissions: PUBLIC_CONTENT, ownership: 'district' },
  resource_document: { tier: 'private', permissions: ['resources:manage'], ownership: 'district' },
} as const satisfies Record<string, UploadTarget>;

export type UploadResourceType = keyof typeof UPLOAD_TARGETS;

// Server-generated only (§3A): never grantable by a client.
export const SERVER_ONLY_RESOURCE_TYPES = ['certificate'] as const;

export function findUploadTarget(resourceType: string): UploadTarget | undefined {
  return (UPLOAD_TARGETS as Record<string, UploadTarget | undefined>)[resourceType];
}

export function resolveUploadTarget(resourceType: string): UploadTarget {
  if ((SERVER_ONLY_RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
    throw new BadRequestException(`resourceType ${resourceType} is generated server-side only`);
  }
  const target = findUploadTarget(resourceType);
  if (!target) throw new BadRequestException(`Unknown resourceType ${resourceType}`);
  return target;
}
