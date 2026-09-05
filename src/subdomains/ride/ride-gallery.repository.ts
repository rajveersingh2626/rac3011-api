import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GalleryItemCreate,
  GalleryItemKind,
  GalleryItemListFilter,
  GalleryItemRow,
} from './ride.types';

const GALLERY_ITEM_SELECT = {
  id: true,
  year: true,
  url: true,
  kind: true,
  caption: true,
  order: true,
  createdAt: true,
} satisfies Prisma.RideGalleryItemSelect;

type GalleryItemSelectResult = Prisma.RideGalleryItemGetPayload<{
  select: typeof GALLERY_ITEM_SELECT;
}>;

// `kind` is a bare String column (spec: "photo|video"), not a Prisma enum - narrow it here at the
// repository boundary, the only layer allowed to see the raw Prisma type.
function toRow(row: GalleryItemSelectResult): GalleryItemRow {
  return { ...row, kind: row.kind as GalleryItemKind };
}

function whereFor(filter: GalleryItemListFilter): Prisma.RideGalleryItemWhereInput {
  return filter.year !== undefined ? { year: filter.year } : {};
}

@Injectable()
export class RideGalleryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: GalleryItemListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: GalleryItemRow[]; total: number }> {
    const where = whereFor(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rideGalleryItem.findMany({
        where,
        select: GALLERY_ITEM_SELECT,
        orderBy: [{ year: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rideGalleryItem.count({ where }),
    ]);
    return { items: items.map(toRow), total };
  }

  async findAllPublic(filter: GalleryItemListFilter): Promise<GalleryItemRow[]> {
    const rows = await this.prisma.rideGalleryItem.findMany({
      where: whereFor(filter),
      select: GALLERY_ITEM_SELECT,
      orderBy: [{ year: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
      take: 500,
    });
    return rows.map(toRow);
  }

  async distinctYears(): Promise<number[]> {
    const rows = await this.prisma.rideGalleryItem.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });
    return rows.map((r) => r.year);
  }

  async findById(id: string): Promise<GalleryItemRow | null> {
    const row = await this.prisma.rideGalleryItem.findUnique({
      where: { id },
      select: GALLERY_ITEM_SELECT,
    });
    return row ? toRow(row) : null;
  }

  async create(data: GalleryItemCreate): Promise<GalleryItemRow> {
    const created = await this.prisma.rideGalleryItem.create({
      data,
      select: { id: true },
    });
    return this.mustFind(created.id);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.rideGalleryItem.delete({ where: { id } });
  }

  private async mustFind(id: string): Promise<GalleryItemRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`RideGalleryItem ${id} vanished after write`);
    return row;
  }
}
