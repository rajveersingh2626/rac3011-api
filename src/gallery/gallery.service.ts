import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CacheInvalidator } from '../cache/cache-invalidator.service';
import { StorageService } from '../storage/storage.service';
import { GalleryRepository } from './gallery.repository';
import type { GalleryItemRow } from './gallery.types';
import type { CreateGalleryItemInput, UpdateGalleryItemInput } from './dto/gallery-item.dto';

@Injectable()
export class GalleryService {
  constructor(
    private readonly repo: GalleryRepository,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly cache: CacheInvalidator,
  ) {}

  list(): Promise<GalleryItemRow[]> {
    return this.repo.findAll();
  }

  listPublic(): Promise<GalleryItemRow[]> {
    return this.repo.findPublic();
  }

  async get(id: string): Promise<GalleryItemRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException('Gallery item not found');
    return row;
  }

  async create(actorId: string, input: CreateGalleryItemInput): Promise<GalleryItemRow> {
    const row = await this.repo.create(input);
    await this.cache.purge(['gallery']);
    await this.audit.record({
      actorId,
      action: 'gallery.created',
      resourceType: 'gallery_item',
      resourceId: row.id,
      after: row,
    });
    return row;
  }

  async update(actorId: string, id: string, input: UpdateGalleryItemInput): Promise<GalleryItemRow> {
    const before = await this.get(id);
    const row = await this.repo.update(id, input);
    if (input.imageUrl !== undefined && input.imageUrl !== before.imageUrl && before.imageUrl) {
      try {
        await this.storage.purgeAssetByUrl(before.imageUrl);
      } catch {}
    }
    await this.cache.purge(['gallery']);
    await this.audit.record({
      actorId,
      action: 'gallery.updated',
      resourceType: 'gallery_item',
      resourceId: id,
      before,
      after: row,
    });
    return row;
  }

  async remove(actorId: string, id: string): Promise<void> {
    const before = await this.get(id);
    await this.repo.delete(id);

    if (before.imageUrl) {
      try {
        await this.storage.purgeAssetByUrl(before.imageUrl);
      } catch {}
    }

    await this.cache.purge(['gallery']);
    await this.audit.record({
      actorId,
      action: 'gallery.deleted',
      resourceType: 'gallery_item',
      resourceId: id,
      before,
    });
  }

  async reorder(actorId: string, ids: string[]): Promise<GalleryItemRow[]> {
    await this.repo.reorder(ids);
    await this.cache.purge(['gallery']);
    const items = await this.list();
    await this.audit.record({
      actorId,
      action: 'gallery.reordered',
      resourceType: 'gallery_item',
      after: { ids },
    });
    return items;
  }
}
