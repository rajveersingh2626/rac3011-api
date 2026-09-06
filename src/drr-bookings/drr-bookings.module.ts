import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DrrBookingsController } from './drr-bookings.controller';
import { DrrBookingsRepository } from './drr-bookings.repository';
import { DrrBookingsService } from './drr-bookings.service';

@Module({
  imports: [AuditModule],
  controllers: [DrrBookingsController],
  providers: [DrrBookingsRepository, DrrBookingsService],
  exports: [DrrBookingsService],
})
export class DrrBookingsModule {}
