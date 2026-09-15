import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RegisterParticipantInput } from './dto/register-participant.dto';

const PARTICIPANT_SELECT = {
  id: true,
  ryYear: true,
  edition: true,
  participantType: true,
  userId: true,
  fullName: true,
  email: true,
  phone: true,
  gender: true,
  rotaryId: true,
  homeDistrict: true,
  homeClubName: true,
  cityState: true,
  country: true,
  clubDesignation: true,
  dietaryPref: true,
  allergiesNotes: true,
  emergencyName: true,
  emergencyPhone: true,
  emergencyRelation: true,
  arrivalAt: true,
  arrivalMode: true,
  arrivalNumber: true,
  departureAt: true,
  hostClubId: true,
  hostFamilyName: true,
  hostFamilyPhone: true,
  hostAddress: true,
  status: true,
  paymentStatus: true,
  paymentRef: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RideParticipantSelect;

export type ParticipantRecord = Prisma.RideParticipantGetPayload<{ select: typeof PARTICIPANT_SELECT }>;

export interface ParticipantListFilter {
  status?: string;
  homeDistrict?: string;
  search?: string;
}

@Injectable()
export class RideParticipantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: RegisterParticipantInput, userId?: string): Promise<ParticipantRecord> {
    return this.prisma.rideParticipant.create({
      data: {
        userId: userId ?? null,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        participantType: data.participantType,
        homeDistrict: data.homeDistrict,
        homeClubName: data.homeClubName,
        cityState: data.cityState,
        country: data.country,
        clubDesignation: data.clubDesignation ?? null,
        dietaryPref: data.dietaryPref,
        allergiesNotes: data.allergiesNotes ?? null,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,
        arrivalAt: data.arrivalAt ? new Date(data.arrivalAt) : null,
        arrivalMode: data.arrivalMode ?? null,
        arrivalNumber: data.arrivalNumber ?? null,
        departureAt: data.departureAt ? new Date(data.departureAt) : null,
        edition: data.edition,
        status: 'submitted',
      },
      select: PARTICIPANT_SELECT,
    });
  }

  async findMany(
    filter: ParticipantListFilter,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ items: ParticipantRecord[]; total: number }> {
    const whereClauses: Prisma.RideParticipantWhereInput[] = [];

    if (filter.status) {
      whereClauses.push({ status: filter.status });
    }
    if (filter.homeDistrict) {
      whereClauses.push({ homeDistrict: filter.homeDistrict });
    }
    if (filter.search) {
      const s = filter.search.trim();
      whereClauses.push({
        OR: [
          { fullName: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
          { homeClubName: { contains: s, mode: 'insensitive' } },
          { id: { contains: s, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.RideParticipantWhereInput =
      whereClauses.length > 0 ? { AND: whereClauses } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rideParticipant.findMany({
        where,
        select: PARTICIPANT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rideParticipant.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<ParticipantRecord | null> {
    return this.prisma.rideParticipant.findUnique({
      where: { id },
      select: PARTICIPANT_SELECT,
    });
  }

  async updateStatus(
    id: string,
    status: string,
    hostClubId?: string | null,
    hostFamilyName?: string,
    hostFamilyPhone?: string,
  ): Promise<ParticipantRecord> {
    return this.prisma.rideParticipant.update({
      where: { id },
      data: {
        status,
        hostClubId: hostClubId !== undefined ? hostClubId : undefined,
        hostFamilyName: hostFamilyName !== undefined ? hostFamilyName : undefined,
        hostFamilyPhone: hostFamilyPhone !== undefined ? hostFamilyPhone : undefined,
      },
      select: PARTICIPANT_SELECT,
    });
  }

  async countStats() {
    const [total, submitted, approved, confirmed, waitlist] = await Promise.all([
      this.prisma.rideParticipant.count(),
      this.prisma.rideParticipant.count({ where: { status: 'submitted' } }),
      this.prisma.rideParticipant.count({ where: { status: 'approved' } }),
      this.prisma.rideParticipant.count({ where: { status: 'confirmed' } }),
      this.prisma.rideParticipant.count({ where: { status: 'waitlist' } }),
    ]);

    return { total, submitted, approved, confirmed, waitlist };
  }
}
