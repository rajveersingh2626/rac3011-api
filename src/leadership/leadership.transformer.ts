import type { DistrictTeamRow } from './leadership.types';

export function districtTeamMemberDto(row: DistrictTeamRow) {
  return {
    id: row.id,
    name: row.name,
    designation: row.designation,
    kind: row.kind,
    photoUrl: row.photoUrl,
    phone: row.phone,
    email: row.email,
    bio: row.bio,
    clubId: row.clubId,
  };
}

export function districtTeamMemberAdminDto(row: DistrictTeamRow) {
  return { ...districtTeamMemberDto(row), order: row.order, ryYear: row.ryYear };
}
