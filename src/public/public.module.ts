import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AchievementsModule } from '../achievements/achievements.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ContentModule } from '../content/content.module';
import { EnquiriesModule } from '../enquiries/enquiries.module';
import { EventsModule } from '../events/events.module';
import { HeritageModule } from '../heritage/heritage.module';
import { LeadershipModule } from '../leadership/leadership.module';
import { PartnersModule } from '../partners/partners.module';
import { PublicationsModule } from '../publications/publications.module';
import { ResourcesModule } from '../resources/resources.module';
import { ShowcaseModule } from '../showcase/showcase.module';
import { PublicClubsRepository } from './public-clubs.repository';
import { PublicClubsService } from './public-clubs.service';
import { PublicHomeService } from './public-home.service';
import { PublicInitiativesService } from './public-initiatives.service';
import { ProjectSummaryRegistry } from './project-summary.registry';
import { PublicController } from './public.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    AchievementsModule,
    AnalyticsModule,
    ContentModule,
    EnquiriesModule,
    EventsModule,
    HeritageModule,
    LeadershipModule,
    PartnersModule,
    PublicationsModule,
    ResourcesModule,
    ShowcaseModule,
  ],
  controllers: [PublicController],
  providers: [
    PublicClubsRepository,
    PublicClubsService,
    PublicHomeService,
    PublicInitiativesService,
    ProjectSummaryRegistry,
  ],
  // Exported so each subdomain module can import PublicModule and register its own summary().
  exports: [ProjectSummaryRegistry],
})
export class PublicModule {}
