import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClubScopeFilter } from '../../common/scope/scope.service';
import type {
  BeneficiaryCreate,
  BeneficiaryListFilter,
  BeneficiaryRow,
  BeneficiaryUpdate,
  SurgeryInput,
} from './drishti.types';

const CLUB_REF_SELECT = { id: true, name: true, shortName: true } satisfies Prisma.ClubSelect;

const SURGERY_SELECT = {
  id: true,
  hospital: true,
  operatedOn: true,
  outcome: true,
  followupOn: true,
} satisfies Prisma.DrishtiSurgerySelect;

const BENEFICIARY_SELECT = {
  id: true,
  clubId: true,
  club: { select: CLUB_REF_SELECT },
  name: true,
  age: true,
  gender: true,
  phoneEncrypted: true,
  eye: true,
  screenedOn: true,
  campLocation: true,
  stage: true,
  notes: true,
  createdById: true,
  surgeries: { select: SURGERY_SELECT, orderBy: { operatedOn: 'desc' } },
  createdAt: true,
} satisfies Prisma.DrishtiBeneficiarySelect;

function whereFor(
  filter: BeneficiaryListFilter,
  scope?: ClubScopeFilter,
): Prisma.DrishtiBeneficiaryWhereInput {
  const clauses: Prisma.DrishtiBeneficiaryWhereInput[] = [];
  if (filter.stage) clauses.push({ stage: filter.stage });
  if (filter.clubId) clauses.push({ clubId: filter.clubId });
  if (scope && !('all' in scope)) clauses.push({ clubId: { in: scope.clubIds } });
  return clauses.length > 0 ? { AND: clauses } : {};
}

@Injectable()
export class DrishtiBeneficiariesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: BeneficiaryListFilter,
    page: number,
    pageSize: number,
    scope?: ClubScopeFilter,
  ): Promise<{ items: BeneficiaryRow[]; total: number }> {
    const where = whereFor(filter, scope);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.drishtiBeneficiary.findMany({
        where,
        select: BENEFICIARY_SELECT,
        orderBy: { screenedOn: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.drishtiBeneficiary.count({ where }),
    ]);
    return { items: items, total };
  }

  findById(id: string): Promise<BeneficiaryRow | null> {
    return this.prisma.drishtiBeneficiary.findUnique({
      where: { id },
      select: BENEFICIARY_SELECT,
    });
  }

  async create(data: BeneficiaryCreate): Promise<BeneficiaryRow> {
    const created = await this.prisma.drishtiBeneficiary.create({
      data,
      select: { id: true },
    });
    return this.mustFind(created.id);
  }

  async update(
    id: string,
    data: BeneficiaryUpdate,
    surgery?: SurgeryInput,
  ): Promise<BeneficiaryRow> {
    await this.prisma.$transaction(async (tx) => {
      await tx.drishtiBeneficiary.update({ where: { id }, data });
      if (surgery) {
        await tx.drishtiSurgery.create({
          data: {
            beneficiaryId: id,
            hospital: surgery.hospital,
            operatedOn: surgery.operatedOn,
            outcome: surgery.outcome,
            followupOn: surgery.followupOn,
          },
        });
      }
    });
    return this.mustFind(id);
  }

  async findClub(clubId: string): Promise<{ id: string } | null> {
    return this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
  }

  private async mustFind(id: string): Promise<BeneficiaryRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`DrishtiBeneficiary ${id} vanished after write`);
    return row;
  }
}
