import type { AnnouncementAudience, RoleHolderCandidate } from './announcements.types';

// spec §6.6: empty audience object = nobody (400).
export function isEmptyAudience(audience: AnnouncementAudience): boolean {
  return (
    (audience.roleKeys?.length ?? 0) === 0 &&
    (audience.zoneIds?.length ?? 0) === 0 &&
    (audience.clubIds?.length ?? 0) === 0 &&
    (audience.memberIds?.length ?? 0) === 0
  );
}

// spec §6.6: resolve(audience) -> userIds = union of (users holding any roleKeys role)
// intersected with (if zoneIds or clubIds given: member's own club/zone, or a role grant
// scoped to those zones/clubs) ∪ explicit memberIds.
//
// `candidates` is already pre-filtered by the repository to users holding one of the
// requested roleKeys (any scope) — this function only applies the zone/club intersection.
export function resolveRoleHolders(
  candidates: RoleHolderCandidate[],
  audience: Pick<AnnouncementAudience, 'zoneIds' | 'clubIds'>,
): Set<string> {
  const zoneIds = new Set(audience.zoneIds ?? []);
  const clubIds = new Set(audience.clubIds ?? []);
  const restricted = zoneIds.size > 0 || clubIds.size > 0;

  const result = new Set<string>();
  for (const candidate of candidates) {
    if (!restricted) {
      result.add(candidate.userId);
      continue;
    }
    const inZoneOrClub =
      (candidate.clubId !== null && clubIds.has(candidate.clubId)) ||
      (candidate.zoneId !== null && zoneIds.has(candidate.zoneId)) ||
      candidate.scopedClubIds.some((id) => clubIds.has(id)) ||
      candidate.scopedZoneIds.some((id) => zoneIds.has(id));
    if (inZoneOrClub) result.add(candidate.userId);
  }
  return result;
}
