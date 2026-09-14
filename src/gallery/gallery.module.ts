import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { StorageModule } from '../storage/storage.module';
import { GalleryController } from './gallery.controller';
import { GalleryRepository } from './gallery.repository';
import { GalleryService } from './gallery.service';

@Module({
  imports: [AuditModule, StorageModule, CacheModule],
  controllers: [GalleryController],
  providers: [GalleryRepository, GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
