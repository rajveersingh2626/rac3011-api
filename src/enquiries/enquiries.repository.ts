import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
