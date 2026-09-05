import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { bullRootOptions } from '../cache/redis.provider';
import { MeModule } from '../me/me.module';
import { PointsModule } from '../points/points.module';
import { ATTENDANCE_RECOMPUTE_QUEUE } from './attendance-recompute.constants';
import { AttendanceRecomputeProcessor } from './attendance-recompute.processor';
import { AttendanceRecomputeTrigger } from './attendance-recompute.trigger';
import { EventsAdminController } from './events-admin.controller';
import { EventsAdminRepository } from './events-admin.repository';
import { EventsAdminService } from './events-admin.service';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  imports: [
    MeModule,
    PointsModule,
    BullModule.forRoot(bullRootOptions()),
    BullModule.registerQueue({ name: ATTENDANCE_RECOMPUTE_QUEUE }),
  ],
  controllers: [EventsAdminController],
  providers: [
    EventsRepository,
    EventsService,
    EventsAdminRepository,
    EventsAdminService,
    AttendanceRecomputeTrigger,
    AttendanceRecomputeProcessor,
  ],
  exports: [EventsService],
})
export class EventsModule {}
