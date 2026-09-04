import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ResourceRow } from './resources.types';

const SELECT = {
  id: true,
  category: true,
  title: true,
  description: true,
  url: true,
  isLocked: true,
  requiredPermission: true,
  comingSoonMonth: true,
  order: true,
} as const;

@Injectable()
export class ResourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<ResourceRow[]> {
    return this.prisma.resource.findMany({
      select: SELECT,
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
  }
}
