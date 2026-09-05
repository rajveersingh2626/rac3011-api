import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DistrictTeamRow } from './leadership.types';

const SELECT = {
  id: true,
  name: true,
  designation: true,
  kind: true,
  order: true,
  photoUrl: true,
  phone: true,
  email: true,
  bio: true,
  clubId: true,
  ryYear: true,
} satisfies Prisma.DistrictTeamMemberSelect;

export type DistrictTeamMemberWrite = {
  memberId?: string | null;
  name?: string;
  designation?: string;
  kind?: 'core' | 'dsc';
  ryYear?: number;
  photoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  bio?: string | null;
  clubId?: string | null;
};

@Injectable()
export class LeadershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async currentTeam(): Promise<DistrictTeamRow[]> {
    const latest = await this.prisma.districtTeamMember.aggregate({ _max: { ryYear: true } });
    const ryYear = latest._max.ryYear;
    if (ryYear == null) return [];
    return this.prisma.districtTeamMember.findMany({
      where: { ryYear },
      select: SELECT,
      orderBy: { order: 'asc' },
    });
  }

  findAllAdmin(): Promise<DistrictTeamRow[]> {
    return this.prisma.districtTeamMember.findMany({
      select: SELECT,
      orderBy: [{ ryYear: 'desc' }, { order: 'asc' }],
    });
  }

  findById(id: string): Promise<DistrictTeamRow | null> {
    return this.prisma.districtTeamMember.findUnique({ where: { id }, select: SELECT });
  }

  async nextOrder(): Promise<number> {
    const max = await this.prisma.districtTeamMember.aggregate({ _max: { order: true } });
    return (max._max.order ?? -1) + 1;
  }

  async create(
    input: Required<Pick<DistrictTeamMemberWrite, 'name' | 'designation' | 'kind' | 'ryYear'>> &
      DistrictTeamMemberWrite,
  ): Promise<DistrictTeamRow> {
    const order = await this.nextOrder();
    return this.prisma.districtTeamMember.create({
      data: {
        memberId: input.memberId ?? null,
        name: input.name,
        designation: input.designation,
        kind: input.kind,
        ryYear: input.ryYear,
        photoUrl: input.photoUrl ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        bio: input.bio ?? null,
        clubId: input.clubId ?? null,
        order,
      },
      select: SELECT,
    });
  }

  update(id: string, input: DistrictTeamMemberWrite): Promise<DistrictTeamRow> {
    return this.prisma.districtTeamMember.update({
      where: { id },
      data: {
        ...(input.memberId !== undefined ? { memberId: input.memberId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.designation !== undefined ? { designation: input.designation } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.ryYear !== undefined ? { ryYear: input.ryYear } : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.clubId !== undefined ? { clubId: input.clubId } : {}),
      },
      select: SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.districtTeamMember.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.districtTeamMember.update({ where: { id }, data: { order } }),
      ),
    );
  }
}
