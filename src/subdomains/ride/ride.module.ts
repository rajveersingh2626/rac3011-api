import { Module, OnModuleInit } from '@nestjs/common';
import { MeModule } from '../../me/me.module';
import { PointsModule } from '../../points/points.module';
import { PublicModule } from '../../public/public.module';
import { ProjectSummaryRegistry } from '../../public/project-summary.registry';
import { RideDashboardService } from './ride-dashboard.service';
import { RideDelegationsController } from './ride-delegations.controller';
import { RideDelegationsRepository } from './ride-delegations.repository';
import { RideDelegationsService } from './ride-delegations.service';
import { RideGalleryController } from './ride-gallery.controller';
import { RideGalleryRepository } from './ride-gallery.repository';
import { RideGalleryService } from './ride-gallery.service';
import { RidePublicController } from './ride-public.controller';
import { RideSupportClubsController } from './ride-support-clubs.controller';
import { RideSupportClubsRepository } from './ride-support-clubs.repository';
import { RideSupportClubsService } from './ride-support-clubs.service';

@Module({
  imports: [MeModule, PublicModule, PointsModule],
  controllers: [
    RideSupportClubsController,
    RideDelegationsController,
    RideGalleryController,
    RidePublicController,
  ],
  providers: [
    RideSupportClubsRepository,
    RideSupportClubsService,
    RideDelegationsRepository,
    RideDelegationsService,
    RideGalleryRepository,
    RideGalleryService,
    RideDashboardService,
  ],
})
export class RideModule implements OnModuleInit {
  constructor(
    private readonly registry: ProjectSummaryRegistry,
    private readonly dashboard: RideDashboardService,
  ) {}

  onModuleInit(): void {
    this.registry.register('ride', () => this.dashboard.summary());
  }
}
