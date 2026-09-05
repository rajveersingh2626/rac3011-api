import type { AdminAssetLinkRow } from './link-health.types';

export function assetLinkAdminDto(row: AdminAssetLinkRow) {
  return {
    id: row.id,
    url: row.url,
    kind: row.kind,
    status: row.status,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row.lastError,
    ownerUserId: row.ownerUserId,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
  };
}
