import type { PartnerRow } from './partners.types';

// Spec §5.3: pending partners are listed (name/tier visible) but without a logoUrl, since permission to display the mark hasn't been granted yet.
export function partnerDto(row: PartnerRow) {
  const pending = row.permissionStatus === 'pending';
  return {
    id: row.id,
    name: row.name,
    logoUrl: pending ? null : row.logoUrl,
    tier: row.tier,
    website: row.website,
    permissionStatus: row.permissionStatus,
  };
}

export function partnerAdminDto(row: PartnerRow) {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logoUrl,
    tier: row.tier,
    website: row.website,
    permissionStatus: row.permissionStatus,
    order: row.order,
  };
}
