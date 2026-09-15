import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PublishedProjectFilter, PublishedProjectRow } from './showcase.types';

const CLUB_SELECT = {
  club: {
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
      zoneId: true,
      zoneRef: { select: { id: true, name: true } },
    },
  },
} as const;

const SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  avenueOfService: true,
  areasOfFocus: true,
  date: true,
  summary: true,
  body: true,
  beneficiaries: true,
  photos: true,
  publishedTitle: true,
  publishedSummary: true,
  publishedBody: true,
  publishedAt: true,
  clubs: { select: { role: true, ...CLUB_SELECT } },
} satisfies Prisma.ProjectSelect;

@Injectable()
export class ShowcaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private whereFor(filter: PublishedProjectFilter): Prisma.ProjectWhereInput {
    const clauses: Prisma.ProjectWhereInput[] = [{ status: 'published' }];
    if (filter.category) {
      clauses.push({
        OR: [
          { category: filter.category },
          { areasOfFocus: { has: filter.category } },
          { avenueOfService: filter.category },
        ],
      });
    }
    if (filter.avenueOfService) {
      clauses.push({ avenueOfService: filter.avenueOfService });
    }
    if (filter.clubSlug) {
      clauses.push({ clubs: { some: { club: { slug: filter.clubSlug } } } });
    }
    return clauses.length === 1 ? clauses[0] : { AND: clauses };
  }

  async findMany(
    filter: PublishedProjectFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: PublishedProjectRow[]; total: number }> {
    const where = this.whereFor(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        select: SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total };
  }

  findBySlug(slug: string): Promise<PublishedProjectRow | null> {
    return this.prisma.project.findFirst({ where: { slug, status: 'published' }, select: SELECT });
  }

  findLatestPublished(take: number): Promise<PublishedProjectRow[]> {
    return this.prisma.project.findMany({
      where: { status: 'published' },
      select: SELECT,
      orderBy: { publishedAt: 'desc' },
      take,
    });
  }
}
