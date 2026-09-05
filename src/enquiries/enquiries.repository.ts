import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { EnquiryRow } from './enquiries.types';

export type EnquiryKind = 'new_club' | 'sponsor' | 'contact';

export type CreateEnquiryInput = {
  kind: EnquiryKind;
  name: string;
  email: string;
  phone?: string;
  organisation?: string;
  message: string;
  payload?: unknown;
  routedTo: string;
};

const ADMIN_SELECT = {
  id: true,
  kind: true,
  name: true,
  email: true,
  phone: true,
  organisation: true,
  message: true,
  payload: true,
  routedTo: true,
  status: true,
  assignedToId: true,
  createdAt: true,
} satisfies Prisma.EnquirySelect;

@Injectable()
export class EnquiriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateEnquiryInput): Promise<{ id: string }> {
    const row = await this.prisma.enquiry.create({
      data: {
        kind: input.kind,
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        organisation: input.organisation ?? null,
        message: input.message,
        payload: (input.payload ?? undefined) as never,
        routedTo: input.routedTo,
      },
      select: { id: true },
    });
    return row;
  }

  findAll(status?: string): Promise<EnquiryRow[]> {
    return this.prisma.enquiry.findMany({
      where: status ? { status } : {},
      select: ADMIN_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<EnquiryRow | null> {
    return this.prisma.enquiry.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
  }

  update(
    id: string,
    input: { status?: string; assignedToId?: string | null },
  ): Promise<EnquiryRow> {
    return this.prisma.enquiry.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
      },
      select: ADMIN_SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.enquiry.delete({ where: { id } });
  }
}
