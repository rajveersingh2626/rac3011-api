import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CareerbridgeStats,
  ListingCreate,
  ListingListFilter,
  ListingReviewUpdate,
  ListingRow,
} from './careerbridge.types';

const LISTING_SELECT = {
  id: true,
  title: true,
  company: true,
  type: true,
  location: true,
  mode: true,
  stipend: true,
  description: true,
  applyUrl: true,
  contactEmail: true,
  postedByName: true,
  postedByEmail: true,
  rotaryAffiliation: true,
  status: true,
  verifiedById: true,
  verifiedAt: true,
  filledAt: true,
  expiresAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CbListingSelect;

function whereFor(filter: ListingListFilter): Prisma.CbListingWhereInput {
  const clauses: Prisma.CbListingWhereInput[] = [];
  if (filter.status) clauses.push({ status: filter.status });
  if (filter.type) clauses.push({ type: filter.type });
  return clauses.length > 0 ? { AND: clauses } : {};
}

@Injectable()
export class CareerbridgeListingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: ListingListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: ListingRow[]; total: number }> {
    const where = whereFor(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.cbListing.findMany({
        where,
        select: LISTING_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.cbListing.count({ where }),
    ]);
    return { items, total };
  }

  // Public browse: verified/filled only, and never a listing whose expiresAt has already
  // passed even if the nightly expiry job hasn't run yet (defense in depth, see decisions.md).
  async findManyPublic(
    filter: Pick<ListingListFilter, 'type'>,
    page: number,
    pageSize: number,
  ): Promise<{ items: ListingRow[]; total: number }> {
    const where: Prisma.CbListingWhereInput = {
      AND: [
        { status: { in: ['verified', 'filled'] } },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ...(filter.type ? [{ type: filter.type }] : []),
      ],
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.cbListing.findMany({
        where,
        select: LISTING_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.cbListing.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<ListingRow | null> {
    return this.prisma.cbListing.findUnique({ where: { id }, select: LISTING_SELECT });
  }

  findByVerifyToken(token: string): Promise<ListingRow | null> {
    return this.prisma.cbListing.findUnique({
      where: { verifyToken: token },
      select: LISTING_SELECT,
    });
  }

  async create(data: ListingCreate): Promise<ListingRow> {
    const created = await this.prisma.cbListing.create({
      data: {
        title: data.title,
        company: data.company,
        type: data.type,
        location: data.location,
        mode: data.mode,
        stipend: data.stipend,
        description: data.description,
        applyUrl: data.applyUrl,
        contactEmail: data.contactEmail,
        postedByName: data.postedByName,
        postedByEmail: data.postedByEmail,
        rotaryAffiliation: data.rotaryAffiliation,
        verifyToken: data.verifyToken,
      },
      select: { id: true },
    });
    return this.mustFind(created.id);
  }

  async markPending(id: string): Promise<ListingRow> {
    await this.prisma.cbListing.update({
      where: { id },
      data: { status: 'pending', verifyToken: null },
    });
    return this.mustFind(id);
  }

  async review(id: string, data: ListingReviewUpdate): Promise<ListingRow> {
    await this.prisma.cbListing.update({
      where: { id },
      data: {
        status: data.status,
        verifiedById: data.verifiedById,
        verifiedAt: data.verifiedAt,
        filledAt: data.filledAt,
        expiresAt: data.expiresAt,
        rejectionReason: data.rejectionReason,
      },
    });
    return this.mustFind(id);
  }

  async expireDue(before: Date): Promise<number> {
    const result = await this.prisma.cbListing.updateMany({
      where: { status: { in: ['verified', 'filled'] }, expiresAt: { lt: before } },
      data: { status: 'expired' },
    });
    return result.count;
  }

  async stats(): Promise<CareerbridgeStats> {
    const grouped = await this.prisma.cbListing.groupBy({ by: ['status'], _count: { _all: true } });
    const countOf = (status: string): number =>
      grouped.find((g) => g.status === status)?._count._all ?? 0;
    return {
      pending: countOf('pending'),
      verified: countOf('verified'),
      filled: countOf('filled'),
      rejected: countOf('rejected'),
      expired: countOf('expired'),
      totalPosted: grouped.reduce((sum, g) => sum + g._count._all, 0),
    };
  }

  async countVerified(): Promise<number> {
    return this.prisma.cbListing.count({ where: { status: 'verified' } });
  }

  async findProjectAdminUserIds(projectKey: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { scopeType: 'project', scopeId: projectKey },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  private async mustFind(id: string): Promise<ListingRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`CbListing ${id} vanished after write`);
    return row;
  }
}
