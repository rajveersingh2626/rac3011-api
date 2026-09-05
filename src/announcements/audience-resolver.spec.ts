import { describe, expect, it } from 'vitest';
import { isEmptyAudience, resolveRoleHolders } from './audience-resolver';
import type { RoleHolderCandidate } from './announcements.types';

describe('isEmptyAudience', () => {
  it('is empty when every field is missing', () => {
    expect(isEmptyAudience({})).toBe(true);
  });

  it('is not empty when any field has an entry', () => {
    expect(isEmptyAudience({ roleKeys: ['secretary'] })).toBe(false);
    expect(isEmptyAudience({ zoneIds: ['zone_agni'] })).toBe(false);
    expect(isEmptyAudience({ clubIds: ['club_a'] })).toBe(false);
    expect(isEmptyAudience({ memberIds: ['member_a'] })).toBe(false);
  });

  it('is empty when fields are present but empty arrays', () => {
    expect(isEmptyAudience({ roleKeys: [], zoneIds: [], clubIds: [], memberIds: [] })).toBe(true);
  });
});

describe('resolveRoleHolders', () => {
  const AGNI_SECRETARY: RoleHolderCandidate = {
    userId: 'user_agni_sec',
    clubId: 'club_agni_1',
    zoneId: 'zone_agni',
    scopedClubIds: [],
    scopedZoneIds: [],
  };
  const VAYU_SECRETARY: RoleHolderCandidate = {
    userId: 'user_vayu_sec',
    clubId: 'club_vayu_1',
    zoneId: 'zone_vayu',
    scopedClubIds: [],
    scopedZoneIds: [],
  };
  const DISTRICT_SCOPED_SECRETARY: RoleHolderCandidate = {
    userId: 'user_district_sec',
    clubId: null,
    zoneId: null,
    scopedClubIds: ['club_agni_2'],
    scopedZoneIds: [],
  };

  it('matches acceptance test #11: roleKeys secretary + zoneIds Agni -> only Agni secretaries', () => {
    const result = resolveRoleHolders([AGNI_SECRETARY, VAYU_SECRETARY], {
      zoneIds: ['zone_agni'],
    });
    expect(result).toEqual(new Set(['user_agni_sec']));
  });

  it('returns every candidate unrestricted when no zoneIds or clubIds are given', () => {
    const result = resolveRoleHolders([AGNI_SECRETARY, VAYU_SECRETARY], {});
    expect(result).toEqual(new Set(['user_agni_sec', 'user_vayu_sec']));
  });

  it('matches via a role grant scoped to the requested club, not just the member profile club', () => {
    const result = resolveRoleHolders([DISTRICT_SCOPED_SECRETARY], { clubIds: ['club_agni_2'] });
    expect(result).toEqual(new Set(['user_district_sec']));
  });

  it('matches via clubIds even when only zoneIds membership differs', () => {
    const result = resolveRoleHolders([AGNI_SECRETARY], { clubIds: ['club_agni_1'] });
    expect(result).toEqual(new Set(['user_agni_sec']));
  });

  it('excludes a candidate whose club/zone is not in the requested set', () => {
    const result = resolveRoleHolders([VAYU_SECRETARY], { zoneIds: ['zone_agni'] });
    expect(result).toEqual(new Set());
  });

  it('returns an empty set for an empty candidate list', () => {
    expect(resolveRoleHolders([], { zoneIds: ['zone_agni'] })).toEqual(new Set());
  });
});
