import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicationRow } from './publications.types';

const SELECT = {
  id: true,
  title: true,
  type: true,
  url: true,
  month: true,
  coverUrl: true,
} as const;

@Injectable()
export class PublicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PublicationRow[]> {
    return this.prisma.publication.findMany({ select: SELECT, orderBy: { month: 'desc' } });
  }
}
