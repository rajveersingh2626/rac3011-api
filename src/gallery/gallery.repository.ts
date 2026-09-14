import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { GalleryItemRow } from './gallery.types';
import type { CreateGalleryItemInput, UpdateGalleryItemInput } from './dto/gallery-item.dto';

@Injectable()
export class GalleryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<GalleryItemRow[]> {
    return this.prisma.galleryItem.findMany({
      orderBy: [{ order: 'asc' }, { date: 'desc' }],
    });
  }

  findPublic(): Promise<GalleryItemRow[]> {
    return this.prisma.galleryItem.findMany({
      orderBy: [{ order: 'asc' }, { date: 'desc' }],
    });
  }

  findById(id: string): Promise<GalleryItemRow | null> {
    return this.prisma.galleryItem.findUnique({ where: { id } });
  }

  async create(input: CreateGalleryItemInput): Promise<GalleryItemRow> {
    const maxOrder = await this.prisma.galleryItem.aggregate({ _max: { order: true } });
    const order = input.order ?? (maxOrder._max.order ?? -1) + 1;
    const date = input.date ? new Date(input.date) : new Date();

    return this.prisma.galleryItem.create({
      data: {
        title: input.title,
        eventName: input.eventName ?? null,
        category: input.category ?? 'general',
        imageUrl: input.imageUrl,
        caption: input.caption ?? null,
        date,
        order,
      },
    });
  }

  update(id: string, input: UpdateGalleryItemInput): Promise<GalleryItemRow> {
    return this.prisma.galleryItem.update({
      where: { id },
      data: {
        title: input.title,
        eventName: input.eventName,
        category: input.category,
        imageUrl: input.imageUrl,
        caption: input.caption,
        date: input.date ? new Date(input.date) : undefined,
        order: input.order,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.galleryItem.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.galleryItem.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }
}
