import { Module, OnModuleInit } from '@nestjs/common';
import { MeModule } from '../../me/me.module';
import { PublicModule } from '../../public/public.module';
import { ProjectSummaryRegistry } from '../../public/project-summary.registry';
import { DrishtiBeneficiariesController } from './drishti-beneficiaries.controller';
import { DrishtiBeneficiariesRepository } from './drishti-beneficiaries.repository';
import { DrishtiBeneficiariesService } from './drishti-beneficiaries.service';
import { DrishtiDashboardRepository } from './drishti-dashboard.repository';
import { DrishtiDashboardService } from './drishti-dashboard.service';
import { DrishtiPublicController } from './drishti-public.controller';

@Module({
  imports: [MeModule, PublicModule],
  controllers: [DrishtiBeneficiariesController, DrishtiPublicController],
  providers: [
    DrishtiBeneficiariesRepository,
    DrishtiBeneficiariesService,
    DrishtiDashboardRepository,
    DrishtiDashboardService,
  ],
})
export class DrishtiModule implements OnModuleInit {
  constructor(
    private readonly registry: ProjectSummaryRegistry,
    private readonly dashboard: DrishtiDashboardService,
  ) {}

  onModuleInit(): void {
    this.registry.register('drishti', () => this.dashboard.summary());
  }
}
