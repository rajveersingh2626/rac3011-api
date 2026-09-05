export type AssetLinkRow = {
  id: string;
  url: string;
  status: 'unchecked' | 'ok' | 'broken' | 'private';
  ownerUserId: string | null;
};

export type AdminAssetLinkRow = AssetLinkRow & {
  kind: string;
  lastCheckedAt: Date | null;
  lastError: string | null;
  resourceType: string;
  resourceId: string;
};
