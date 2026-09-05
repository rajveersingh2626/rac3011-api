import { BullModule } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SettingsModule } from '../../settings/settings.module';
import { PublicModule } from '../../public/public.module';
import { ProjectSummaryRegistry } from '../../public/project-summary.registry';
import { CareerbridgeExpiryProcessor } from './careerbridge-expiry.processor';
import { CareerbridgeExpiryScheduler } from './careerbridge-expiry.scheduler';
import { CareerbridgeDashboardService } from './careerbridge-dashboard.service';
import { CareerbridgeListingsController } from './careerbridge-listings.controller';
import { CareerbridgeListingsRepository } from './careerbridge-listings.repository';
import { CareerbridgeListingsService } from './careerbridge-listings.service';
import { CareerbridgePublicController } from './careerbridge-public.controller';

@Module({
  imports: [
    SettingsModule,
    PublicModule,
    // Relies on the global BullMQ config already registered by LinkHealthModule's forRoot().
    BullModule.registerQueue({ name: 'careerbridge-expiry' }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 3600000, limit: 5 }]),
  ],
  controllers: [CareerbridgeListingsController, CareerbridgePublicController],
  providers: [
    CareerbridgeListingsRepository,
    CareerbridgeListingsService,
    CareerbridgeDashboardService,
    CareerbridgeExpiryProcessor,
    CareerbridgeExpiryScheduler,
  ],
})
export class CareerbridgeModule implements OnModuleInit {
  constructor(
    private readonly registry: ProjectSummaryRegistry,
    private readonly dashboard: CareerbridgeDashboardService,
  ) {}

  onModuleInit(): void {
    this.registry.register('careerbridge', () => this.dashboard.summary());
  }
}
