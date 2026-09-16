import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RegisterParticipantInput } from './dto/register-participant.dto';

const PARTICIPANT_SELECT = {
  id: true,
  ryYear: true,
  edition: true,
  participantType: true,
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
  approvalStatus: true,
  dossierStatus: true,
  dossierData: true,
  isActive: true,
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

  async create(data: RegisterParticipantInput): Promise<ParticipantRecord> {
    const rawArrival = data.arrivalAt || (data.arrivalDateTime ? new Date(data.arrivalDateTime).toISOString() : null);
    const arrivalDate = rawArrival ? new Date(rawArrival) : null;
    const departureDate = data.departureAt ? new Date(data.departureAt) : null;

    return this.prisma.rideParticipant.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        participantType: data.participantType,
        homeDistrict: data.homeDistrict || data.districtNumber || '3141',
        homeClubName: data.homeClubName || data.clubName || 'Rotaract Club',
        cityState: data.cityState || data.arrivalLocation || 'Delhi NCR',
        country: data.country || 'India',
        clubDesignation: data.clubDesignation ?? data.rotaryRole ?? null,
        dietaryPref: data.dietaryPref || data.dietaryPreference || 'veg',
        allergiesNotes: data.allergiesNotes ?? data.allergies ?? null,
        emergencyName: data.emergencyName || data.emergencyContactName || 'Emergency Contact',
        emergencyPhone: data.emergencyPhone || data.emergencyContactPhone || '+91 99999 99999',
        emergencyRelation: data.emergencyRelation || 'Guardian',
        arrivalAt: arrivalDate && !isNaN(arrivalDate.getTime()) ? arrivalDate : null,
        arrivalMode: data.arrivalMode ?? null,
        arrivalNumber: data.arrivalNumber ?? data.pnrNumber ?? null,
        departureAt: departureDate && !isNaN(departureDate.getTime()) ? departureDate : null,
        edition: data.edition || 'delhi_meri_jaan_2026',
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

  async deleteParticipant(id: string): Promise<void> {
    await this.prisma.rideParticipant.delete({
      where: { id },
    });
  }

  async updateDossier(
    id: string,
    dossierData: Record<string, any>,
    dossierStatus?: string,
  ): Promise<ParticipantRecord> {
    return this.prisma.rideParticipant.update({
      where: { id },
      data: {
        dossierData,
        dossierStatus: dossierStatus !== undefined ? dossierStatus : undefined,
      },
      select: PARTICIPANT_SELECT,
    });
  }

  async findByEmail(email: string): Promise<ParticipantRecord | null> {
    return this.prisma.rideParticipant.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
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
