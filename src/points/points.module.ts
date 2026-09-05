import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { createCacheRedis } from '../cache/redis.provider';
import { ClubFactAdapter } from './adapters/club-fact.adapter';
import { DeferredSourceAdapter } from './adapters/deferred-source.adapter';
import { EventAttendanceAdapter } from './adapters/event-attendance.adapter';
import { POINT_SOURCE_ADAPTERS } from './adapters/point-source.port';
import { ReportFieldAdapter } from './adapters/report-field.adapter';
import { ClubPointsController } from './club-points.controller';
import { ClubPointsService } from './club-points.service';
import { PointsEngineService } from './engine/points-engine.service';
import { PointsRecomputeProcessor } from './engine/points-recompute.processor';
import { POINTS_RECOMPUTE_QUEUE } from './engine/points-recompute.constants';
import { PointsRecomputeTrigger } from './engine/points-recompute-trigger.service';
import { PointCategoriesController, PointRulesController } from './point-rules.controller';
import { PointRulesService } from './point-rules.service';
import { PointsEntriesRepository } from './points-entries.repository';
import { PointsRepository } from './points.repository';
import { PointsSourceRepository } from './points-source.repository';
import type { SourceTypeKey } from './points.types';

@Module({
  imports: [
    BullModule.forRoot({ connection: createCacheRedis() }),
    BullModule.registerQueue({ name: POINTS_RECOMPUTE_QUEUE }),
  ],
  controllers: [PointCategoriesController, PointRulesController, ClubPointsController],
  providers: [
    PointsRepository,
    PointsEntriesRepository,
    PointsSourceRepository,
    PointRulesService,
    ClubPointsService,
    PointsEngineService,
    PointsRecomputeTrigger,
    PointsRecomputeProcessor,
    ReportFieldAdapter,
    ClubFactAdapter,
    EventAttendanceAdapter,
    DeferredSourceAdapter,
    {
      provide: POINT_SOURCE_ADAPTERS,
      useFactory: (
        reportField: ReportFieldAdapter,
        clubFact: ClubFactAdapter,
        eventAttendance: EventAttendanceAdapter,
        deferred: DeferredSourceAdapter,
      ): Record<
        SourceTypeKey,
        ReportFieldAdapter | ClubFactAdapter | EventAttendanceAdapter | DeferredSourceAdapter
      > => ({
        report_field: reportField,
        club_fact: clubFact,
        event_attendance: eventAttendance,
        project_collaboration: deferred,
        ride_hosting: deferred,
        club_events: deferred,
      }),
      inject: [ReportFieldAdapter, ClubFactAdapter, EventAttendanceAdapter, DeferredSourceAdapter],
    },
  ],
  exports: [PointsEngineService, PointsRepository],
})
export class PointsModule {}
