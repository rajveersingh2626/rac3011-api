import { Module, OnModuleInit } from '@nestjs/common';
import { PublicModule } from '../../public/public.module';
import { ProjectSummaryRegistry } from '../../public/project-summary.registry';
import { RclFixturesController } from './rcl-fixtures.controller';
import { RclFixturesRepository } from './rcl-fixtures.repository';
import { RclFixturesService } from './rcl-fixtures.service';
import { RclPublicController } from './rcl-public.controller';
import { RclSettingsRepository } from './rcl-settings.repository';
import { RclStandingsRepository } from './rcl-standings.repository';
import { RclStandingsService } from './rcl-standings.service';
import { RclTeamsController } from './rcl-teams.controller';
import { RclTeamsRepository } from './rcl-teams.repository';
import { RclTeamsService } from './rcl-teams.service';

@Module({
  imports: [PublicModule],
  controllers: [RclTeamsController, RclFixturesController, RclPublicController],
  providers: [
    RclSettingsRepository,
    RclTeamsRepository,
    RclTeamsService,
    RclFixturesRepository,
    RclFixturesService,
    RclStandingsRepository,
    RclStandingsService,
  ],
})
export class RclModule implements OnModuleInit {
  constructor(
    private readonly registry: ProjectSummaryRegistry,
    private readonly standings: RclStandingsService,
  ) {}

  onModuleInit(): void {
    this.registry.register('rcl', () => this.standings.summary());
  }
}
