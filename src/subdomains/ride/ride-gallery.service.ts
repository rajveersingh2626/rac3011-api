import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheInvalidator } from '../../cache/cache-invalidator.service';
import { ScopeService } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import type { CreateGalleryItemInput } from './dto/create-gallery-item.dto';
import { RideGalleryRepository } from './ride-gallery.repository';
import type { GalleryItemListFilter, GalleryItemRow } from './ride.types';
import { RideBaseManagerService } from './ride-base.service';

@Injectable()
export class RideGalleryService extends RideBaseManagerService {
  constructor(
    private readonly repo: RideGalleryRepository,
    scope: ScopeService,
    private readonly cache: CacheInvalidator,
  ) {
    super(scope);
  }

  list(
    filter: GalleryItemListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: GalleryItemRow[]; total: number }> {
    return this.repo.findMany(filter, page, pageSize);
  }

  async publicList(
    filter: GalleryItemListFilter,
  ): Promise<{ items: GalleryItemRow[]; years: number[] }> {
    const [items, years] = await Promise.all([
      this.repo.findAllPublic(filter),
      this.repo.distinctYears(),
    ]);
    return { items, years };
  }

  async create(ctx: RequestContext, input: CreateGalleryItemInput): Promise<GalleryItemRow> {
    this.assertManage(ctx);
    const created = await this.repo.create({
      year: input.year,
      url: input.url,
      kind: input.kind,
      caption: input.caption ?? null,
      headingLeft: input.headingLeft ?? null,
      headingRight: input.headingRight ?? null,
      order: input.order,
    });
    await this.cache.purge(['ride']);
    return created;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    this.assertManage(ctx);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    await this.repo.delete(id);
    await this.cache.purge(['ride']);
  }
}
