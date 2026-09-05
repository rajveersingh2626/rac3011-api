import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PastDrrRow } from './heritage.types';

const SELECT = {
  id: true,
  name: true,
  slug: true,
  terms: true,
  homeClubId: true,
  photoUrl: true,
  bio: true,
  order: true,
  isLowResPhoto: true,
} satisfies Prisma.PastDrrSelect;

export type PastDrrWrite = {
  name?: string;
  slug?: string;
  terms?: string[];
  homeClubId?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  isLowResPhoto?: boolean;
};

@Injectable()
export class HeritageRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PastDrrRow[]> {
    return this.prisma.pastDrr.findMany({ select: SELECT, orderBy: { order: 'asc' } });
  }

  findBySlug(slug: string): Promise<PastDrrRow | null> {
    return this.prisma.pastDrr.findUnique({ where: { slug }, select: SELECT });
  }

  findById(id: string): Promise<PastDrrRow | null> {
    return this.prisma.pastDrr.findUnique({ where: { id }, select: SELECT });
  }

  async nextOrder(): Promise<number> {
    const max = await this.prisma.pastDrr.aggregate({ _max: { order: true } });
    return (max._max.order ?? -1) + 1;
  }

  async create(
    input: Required<Pick<PastDrrWrite, 'name' | 'slug' | 'terms'>> & PastDrrWrite,
  ): Promise<PastDrrRow> {
    const order = await this.nextOrder();
    return this.prisma.pastDrr.create({
      data: {
        name: input.name,
        slug: input.slug,
        terms: input.terms,
        homeClubId: input.homeClubId ?? null,
        photoUrl: input.photoUrl ?? null,
        bio: input.bio ?? null,
        isLowResPhoto: input.isLowResPhoto ?? false,
        order,
      },
      select: SELECT,
    });
  }

  update(id: string, input: PastDrrWrite): Promise<PastDrrRow> {
    return this.prisma.pastDrr.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.terms !== undefined ? { terms: input.terms } : {}),
        ...(input.homeClubId !== undefined ? { homeClubId: input.homeClubId } : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.isLowResPhoto !== undefined ? { isLowResPhoto: input.isLowResPhoto } : {}),
      },
      select: SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pastDrr.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, order) => this.prisma.pastDrr.update({ where: { id }, data: { order } })),
    );
  }
}
