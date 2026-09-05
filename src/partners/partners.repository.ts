import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PartnerRow } from './partners.types';

const SELECT = {
  id: true,
  name: true,
  logoUrl: true,
  tier: true,
  website: true,
  permissionStatus: true,
  order: true,
} satisfies Prisma.PartnerSelect;

export type PartnerWrite = {
  name?: string;
  logoUrl?: string | null;
  tier?: string;
  website?: string | null;
  permissionStatus?: 'pending' | 'granted';
};

@Injectable()
export class PartnersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PartnerRow[]> {
    return this.prisma.partner.findMany({ select: SELECT, orderBy: { order: 'asc' } });
  }

  findById(id: string): Promise<PartnerRow | null> {
    return this.prisma.partner.findUnique({ where: { id }, select: SELECT });
  }

  async nextOrder(): Promise<number> {
    const max = await this.prisma.partner.aggregate({ _max: { order: true } });
    return (max._max.order ?? -1) + 1;
  }

  async create(
    input: Required<Pick<PartnerWrite, 'name' | 'tier'>> & PartnerWrite,
  ): Promise<PartnerRow> {
    const order = await this.nextOrder();
    return this.prisma.partner.create({
      data: {
        name: input.name,
        tier: input.tier,
        logoUrl: input.logoUrl ?? null,
        website: input.website ?? null,
        permissionStatus: input.permissionStatus ?? 'pending',
        order,
      },
      select: SELECT,
    });
  }

  update(id: string, input: PartnerWrite): Promise<PartnerRow> {
    return this.prisma.partner.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.tier !== undefined ? { tier: input.tier } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.website !== undefined ? { website: input.website } : {}),
        ...(input.permissionStatus !== undefined
          ? { permissionStatus: input.permissionStatus }
          : {}),
      },
      select: SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.partner.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, order) => this.prisma.partner.update({ where: { id }, data: { order } })),
    );
  }
}
