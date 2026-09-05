import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ResourceCategory, ResourceRow } from './resources.types';

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
} satisfies Prisma.ResourceSelect;

export type ResourceWrite = {
  category?: ResourceCategory;
  title?: string;
  description?: string | null;
  url?: string;
  isLocked?: boolean;
  requiredPermission?: string | null;
  comingSoonMonth?: string | null;
};

@Injectable()
export class ResourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<ResourceRow[]> {
    return this.prisma.resource.findMany({
      select: SELECT,
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
  }

  findById(id: string): Promise<ResourceRow | null> {
    return this.prisma.resource.findUnique({ where: { id }, select: SELECT });
  }

  async nextOrder(category: ResourceCategory): Promise<number> {
    const max = await this.prisma.resource.aggregate({
      where: { category },
      _max: { order: true },
    });
    return (max._max.order ?? -1) + 1;
  }

  async create(
    input: Required<Pick<ResourceWrite, 'category' | 'title' | 'url'>> & ResourceWrite,
  ): Promise<ResourceRow> {
    const order = await this.nextOrder(input.category);
    return this.prisma.resource.create({
      data: {
        category: input.category,
        title: input.title,
        url: input.url,
        description: input.description ?? null,
        isLocked: input.isLocked ?? false,
        requiredPermission: input.requiredPermission ?? null,
        comingSoonMonth: input.comingSoonMonth ?? null,
        order,
      },
      select: SELECT,
    });
  }

  update(id: string, input: ResourceWrite): Promise<ResourceRow> {
    return this.prisma.resource.update({
      where: { id },
      data: {
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isLocked !== undefined ? { isLocked: input.isLocked } : {}),
        ...(input.requiredPermission !== undefined
          ? { requiredPermission: input.requiredPermission }
          : {}),
        ...(input.comingSoonMonth !== undefined ? { comingSoonMonth: input.comingSoonMonth } : {}),
      },
      select: SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.resource.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, order) => this.prisma.resource.update({ where: { id }, data: { order } })),
    );
  }
}
