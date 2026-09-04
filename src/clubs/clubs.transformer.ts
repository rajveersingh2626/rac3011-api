import type {
  BoardMemberRow,
  ClubFactsRow,
  ClubRow,
  ClubWithRelations,
  ZoneRow,
} from './clubs.types';

export type ClubSummaryDto = {
  id: string;
  name: string;
  shortName: string | null;
  zoneId: string | null;
};

const day = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

export function clubSummaryDto(
  row: Pick<ClubRow, 'id' | 'name' | 'shortName' | 'zoneId'>,
): ClubSummaryDto {
  return { id: row.id, name: row.name, shortName: row.shortName, zoneId: row.zoneId };
}

export function boardMemberDto(row: BoardMemberRow) {
  return {
    id: row.id,
    clubId: row.clubId,
    memberId: row.memberId,
    name: row.name,
    position: row.position,
    bloodGroup: row.bloodGroup,
    phone: row.phone,
    email: row.email,
    ryYear: row.ryYear,
    order: row.order,
  };
}

export function clubFactsDto(row: ClubFactsRow) {
  return {
    id: row.id,
    clubId: row.clubId,
    ryYear: row.ryYear,
    duesPaidOn: day(row.duesPaidOn),
    riCitationCompleted: row.riCitationCompleted,
    paulHarrisFellows: row.paulHarrisFellows,
    dualMembers: row.dualMembers,
    mdioCommitteeMembers: row.mdioCommitteeMembers,
    mdioEventsAttended: row.mdioEventsAttended,
    sisterClubSignedOn: day(row.sisterClubSignedOn),
    drrVisitOn: day(row.drrVisitOn),
    vocationalCentreOn: day(row.vocationalCentreOn),
    activeSocialHandles: row.activeSocialHandles,
    clubMerchandise: row.clubMerchandise,
    clubWebsiteUrl: row.clubWebsiteUrl,
    priorYearMemberCount: row.priorYearMemberCount,
  };
}

export function clubDto(row: ClubWithRelations) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    slug: row.slug,
    zone: row.zone,
    zoneId: row.zoneId,
    lat: row.lat,
    lng: row.lng,
    president: row.president,
    phone: row.phone,
    email: row.email,
    rotaryId: row.rotaryId,
    secretary: row.secretary,
    secretaryEmail: row.secretaryEmail,
    secretaryPhone: row.secretaryPhone,
    charterDate: day(row.charterDate),
    isActive: row.isActive,
    meetingInfo: row.meetingInfo,
    socialLinks: row.socialLinks ?? null,
    logoUrl: row.logoUrl,
    memberCount: row.memberCount,
    ...(row.board ? { board: row.board.map(boardMemberDto) } : {}),
    ...(row.facts ? { facts: row.facts.map(clubFactsDto) } : {}),
  };
}

export function zoneDto(row: ZoneRow) {
  return { id: row.id, name: row.name, order: row.order };
}
