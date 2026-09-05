import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SisterClubRequestRow } from './sister-club-requests.types';

const SELECT = {
  id: true,
  clubId: true,
  partnerClubName: true,
  partnerDistrict: true,
  country: true,
  contactName: true,
  contactEmail: true,
  status: true,
  signedOn: true,
  submittedById: true,
  createdAt: true,
} satisfies Prisma.SisterClubRequestSelect;

export type CreateSisterClubRequestData = {
  clubId: string;
  partnerClubName: string;
  partnerDistrict: string;
  country: string;
  contactName: string;
  contactEmail: string;
  submittedById: string | null;
};

@Injectable()
export class SisterClubRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string): Promise<SisterClubRequestRow[]> {
    return this.prisma.sisterClubRequest.findMany({
      where: status ? { status } : {},
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<SisterClubRequestRow | null> {
    return this.prisma.sisterClubRequest.findUnique({ where: { id }, select: SELECT });
  }

  create(input: CreateSisterClubRequestData): Promise<SisterClubRequestRow> {
    return this.prisma.sisterClubRequest.create({
      data: {
        clubId: input.clubId,
        partnerClubName: input.partnerClubName,
        partnerDistrict: input.partnerDistrict,
        country: input.country,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        submittedById: input.submittedById,
      },
      select: SELECT,
    });
  }

  update(
    id: string,
    input: { status?: string; signedOn?: string | null },
  ): Promise<SisterClubRequestRow> {
    return this.prisma.sisterClubRequest.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.signedOn !== undefined
          ? { signedOn: input.signedOn ? new Date(`${input.signedOn}T00:00:00.000Z`) : null }
          : {}),
      },
      select: SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sisterClubRequest.delete({ where: { id } });
  }
}
