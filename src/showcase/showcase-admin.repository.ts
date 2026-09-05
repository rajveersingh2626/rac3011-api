import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubScopeFilter } from '../common/scope/scope.service';
import type {
  ProjectClubRoleKind,
  ProjectListFilter,
  ProjectRow,
  ProjectStatus,
} from './showcase.types';

const PROJECT_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  date: true,
  summary: true,
  body: true,
  beneficiaries: true,
  photos: true,
  submittedById: true,
  status: true,
  consentConfirmed: true,
  submittedAt: true,
  publishedTitle: true,
  publishedSummary: true,
  publishedBody: true,
  editorNotes: true,
  rejectionReason: true,
  publishedAt: true,
  publishedById: true,
  clubs: {
    select: {
      role: true,
      club: { select: { id: true, name: true, shortName: true, slug: true } },
    },
  },
} satisfies Prisma.ProjectSelect;

export type ProjectCreate = {
  title: string;
  category: string;
  date: Date;
  summary: string;
  body: string | null;
  beneficiaries: number | null;
  photos: string[];
  submittedById: string;
  consentConfirmed: boolean;
};

export type ProjectUpdate = Partial<{
  title: string;
  category: string;
  date: Date;
  summary: string;
  body: string | null;
  beneficiaries: number | null;
  photos: string[];
  consentConfirmed: boolean;
  status: ProjectStatus;
  submittedAt: Date | null;
  publishedTitle: string | null;
  publishedSummary: string | null;
  publishedBody: string | null;
  editorNotes: string | null;
  rejectionReason: string | null;
  slug: string | null;
  publishedAt: Date | null;
  publishedById: string | null;
}>;

export type ProjectClubInput = { clubId: string; role: ProjectClubRoleKind };

function whereFor(filter: ProjectListFilter): Prisma.ProjectWhereInput[] {
  const clauses: Prisma.ProjectWhereInput[] = [];
  if (filter.status) clauses.push({ status: filter.status });
  if (filter.category) clauses.push({ category: filter.category });
  if (filter.clubId) clauses.push({ clubs: { some: { clubId: filter.clubId } } });
  return clauses;
}

@Injectable()
export class ShowcaseAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwn(
    submittedById: string,
    filter: ProjectListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: ProjectRow[]; total: number }> {
    const where: Prisma.ProjectWhereInput = { AND: [{ submittedById }, ...whereFor(filter)] };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        select: PROJECT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total };
  }

  async findQueue(
    scope: ClubScopeFilter,
    filter: ProjectListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: ProjectRow[]; total: number }> {
    const clauses = whereFor(filter);
    if (!('all' in scope)) {
      clauses.push({ clubs: { some: { role: 'lead', clubId: { in: scope.clubIds } } } });
    }
    const where: Prisma.ProjectWhereInput = clauses.length > 0 ? { AND: clauses } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        select: PROJECT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<ProjectRow | null> {
    return this.prisma.project.findUnique({ where: { id }, select: PROJECT_SELECT });
  }

  create(data: ProjectCreate): Promise<{ id: string }> {
    return this.prisma.project.create({ data, select: { id: true } });
  }

  update(id: string, data: ProjectUpdate): Promise<ProjectRow> {
    return this.prisma.project.update({
      where: { id },
      data: data,
      select: PROJECT_SELECT,
    });
  }

  async replaceClubs(projectId: string, clubs: ProjectClubInput[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.projectClub.deleteMany({ where: { projectId } }),
      this.prisma.projectClub.createMany({
        data: clubs.map((c) => ({ projectId, clubId: c.clubId, role: c.role })),
      }),
    ]);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }

  async findExistingClubIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.club.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async findClubOfficerUserIds(clubId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: {
        scopeType: 'club',
        scopeId: clubId,
        role: { key: { in: ['president', 'secretary'] } },
      },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await this.prisma.project.count({ where: { slug } })) > 0;
  }
}
