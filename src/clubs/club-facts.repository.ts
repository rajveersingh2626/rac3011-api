import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubFactsRow } from './clubs.types';

const FACTS_SELECT = {
  id: true,
  clubId: true,
  ryYear: true,
  duesPaidOn: true,
  riCitationCompleted: true,
  paulHarrisFellows: true,
  dualMembers: true,
  mdioCommitteeMembers: true,
  mdioEventsAttended: true,
  sisterClubSignedOn: true,
  drrVisitOn: true,
  vocationalCentreOn: true,
  activeSocialHandles: true,
  clubMerchandise: true,
  clubWebsiteUrl: true,
  priorYearMemberCount: true,
} satisfies Prisma.ClubFactsSelect;

export type ClubFactsUpdate = Partial<{
  duesPaidOn: Date | null;
  riCitationCompleted: boolean;
  paulHarrisFellows: number;
  dualMembers: number;
  mdioCommitteeMembers: number;
  mdioEventsAttended: number;
  sisterClubSignedOn: Date | null;
  drrVisitOn: Date | null;
  vocationalCentreOn: Date | null;
  activeSocialHandles: number;
  clubMerchandise: boolean;
  clubWebsiteUrl: string | null;
  priorYearMemberCount: number | null;
}>;

@Injectable()
export class ClubFactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(clubId: string, ryYear: number): Promise<ClubFactsRow | null> {
    return this.prisma.clubFacts.findUnique({
      where: { clubId_ryYear: { clubId, ryYear } },
      select: FACTS_SELECT,
    });
  }

  async upsert(
    clubId: string,
    ryYear: number,
    data: ClubFactsUpdate,
    updatedById: string,
  ): Promise<ClubFactsRow> {
    return this.prisma.clubFacts.upsert({
      where: { clubId_ryYear: { clubId, ryYear } },
      create: { clubId, ryYear, ...data, updatedById },
      update: { ...data, updatedById },
      select: FACTS_SELECT,
    });
  }
}
