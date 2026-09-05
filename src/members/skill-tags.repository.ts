import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SkillTagRow } from './members.types';

@Injectable()
export class SkillTagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<SkillTagRow[]> {
    return this.prisma.skillTag.findMany({
      select: { id: true, label: true, kind: true },
      orderBy: [{ kind: 'asc' }, { label: 'asc' }],
    });
  }
}
