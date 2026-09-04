import { Module } from '@nestjs/common';
import { ClubsController, ZonesController } from './clubs.controller';
import { ClubsRepository } from './clubs.repository';
import { ClubsService } from './clubs.service';

@Module({
  controllers: [ClubsController, ZonesController],
  providers: [ClubsRepository, ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}
