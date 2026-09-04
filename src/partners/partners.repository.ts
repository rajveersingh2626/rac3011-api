import { Injectable } from '@nestjs/common';
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
} as const;

@Injectable()
export class PartnersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PartnerRow[]> {
    return this.prisma.partner.findMany({ select: SELECT, orderBy: { order: 'asc' } });
  }
}
