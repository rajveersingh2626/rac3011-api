import type { CacheTag } from './cache.constants';

// Prisma model name -> cache tags to purge after a successful write.
// Unlisted models resolve to [] via getModelTags (write op fires, nothing to purge).
export const MODEL_TAG_MAP: Record<string, CacheTag[]> = {
  Club: ['clubs'],
  ClubBoardMember: ['clubs'],
  Zone: ['zones'],
  PastDrr: ['heritage'],
  DistrictTeamMember: ['district-team'],
  Achievement: ['achievements'],
  Partner: ['partners'],
  Publication: ['publications'],
  Resource: ['resources'],
  ContentBlock: ['content'],
  Setting: ['settings'],
  Event: ['events'],
  Project: ['projects'],
  ProjectClub: ['projects'],
  MemberProfile: ['members'],
  Report: ['reports'],
  ClubPointEntry: ['points'],
  M3011Camp: ['mission3011'],
  M3011CampClub: ['mission3011'],
  DrishtiBeneficiary: ['drishti'],
  DrishtiSurgery: ['drishti'],
  CbListing: ['careerbridge'],
  RideSupportClub: ['ride'],
  RideDelegation: ['ride'],
  RideDelegationHost: ['ride'],
  RideGalleryItem: ['ride'],
  RclTeam: ['rcl'],
  RclPlayer: ['rcl'],
  RclFixture: ['rcl'],
  RclResult: ['rcl'],
};

export function getModelTags(model: string | undefined): CacheTag[] {
  if (!model) return [];
  return MODEL_TAG_MAP[model] ?? [];
}
