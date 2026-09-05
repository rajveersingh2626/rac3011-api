import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicationRow } from './publications.types';

const SELECT = {
  id: true,
  title: true,
  type: true,
  url: true,
  month: true,
  coverUrl: true,
} satisfies Prisma.PublicationSelect;

export type PublicationWrite = {
  title?: string;
  type?: 'directory' | 'newsletter';
  url?: string;
  month?: string;
  coverUrl?: string | null;
};

@Injectable()
export class PublicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PublicationRow[]> {
    return this.prisma.publication.findMany({ select: SELECT, orderBy: { month: 'desc' } });
  }

  findById(id: string): Promise<PublicationRow | null> {
    return this.prisma.publication.findUnique({ where: { id }, select: SELECT });
  }

  create(
    input: Required<Pick<PublicationWrite, 'title' | 'type' | 'url' | 'month'>> & PublicationWrite,
  ): Promise<PublicationRow> {
    return this.prisma.publication.create({
      data: {
        title: input.title,
        type: input.type,
        url: input.url,
        month: new Date(`${input.month}-01T00:00:00.000Z`),
        coverUrl: input.coverUrl ?? null,
      },
      select: SELECT,
    });
  }

  update(id: string, input: PublicationWrite): Promise<PublicationRow> {
    return this.prisma.publication.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.month !== undefined
          ? { month: new Date(`${input.month}-01T00:00:00.000Z`) }
          : {}),
        ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
      },
      select: SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.publication.delete({ where: { id } });
  }
}
