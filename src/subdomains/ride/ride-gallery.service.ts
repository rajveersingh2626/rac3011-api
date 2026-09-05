import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ScopeService } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import type { CreateGalleryItemInput } from './dto/create-gallery-item.dto';
import { RideGalleryRepository } from './ride-gallery.repository';
import type { GalleryItemListFilter, GalleryItemRow } from './ride.types';

const MANAGE_PERMISSION = 'subdomain:ride:manage' as const;

@Injectable()
export class RideGalleryService {
  constructor(
    private readonly repo: RideGalleryRepository,
    private readonly scope: ScopeService,
  ) {}

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
    return this.repo.create({
      year: input.year,
      url: input.url,
      kind: input.kind,
      caption: input.caption ?? null,
      order: input.order,
    });
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    this.assertManage(ctx);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    await this.repo.delete(id);
  }

  private assertManage(ctx: RequestContext): void {
    if (!this.hasManageGrant(ctx)) throw new ForbiddenException();
    this.scope.assertCanAccessProject(ctx.access, MANAGE_PERMISSION, 'ride');
  }

  private hasManageGrant(ctx: RequestContext): boolean {
    return ctx.access.isSuperAdmin || (ctx.access.grants[MANAGE_PERMISSION] ?? []).length > 0;
  }
}
