import { Module, OnModuleInit } from '@nestjs/common';
import { MeModule } from '../../me/me.module';
import { PublicModule } from '../../public/public.module';
import { ProjectSummaryRegistry } from '../../public/project-summary.registry';
import { Mission3011CampsController } from './mission3011-camps.controller';
import { Mission3011CampsRepository } from './mission3011-camps.repository';
import { Mission3011CampsService } from './mission3011-camps.service';
import { Mission3011DashboardRepository } from './mission3011-dashboard.repository';
import { Mission3011DashboardService } from './mission3011-dashboard.service';
import { Mission3011PublicController } from './mission3011-public.controller';

@Module({
  imports: [MeModule, PublicModule],
  controllers: [Mission3011CampsController, Mission3011PublicController],
  providers: [
    Mission3011CampsRepository,
    Mission3011CampsService,
    Mission3011DashboardRepository,
    Mission3011DashboardService,
  ],
})
export class Mission3011Module implements OnModuleInit {
  constructor(
    private readonly registry: ProjectSummaryRegistry,
    private readonly dashboard: Mission3011DashboardService,
  ) {}

  onModuleInit(): void {
    this.registry.register('mission3011', () => this.dashboard.summary());
  }
}
