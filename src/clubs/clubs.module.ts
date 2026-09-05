import { Module } from '@nestjs/common';
import { ClubFactsController } from './club-facts.controller';
import { ClubFactsRepository } from './club-facts.repository';
import { ClubFactsService } from './club-facts.service';
import { ClubsController, ZonesController } from './clubs.controller';
import { ClubsRepository } from './clubs.repository';
import { ClubsService } from './clubs.service';

@Module({
  controllers: [ClubsController, ZonesController, ClubFactsController],
  providers: [ClubsRepository, ClubsService, ClubFactsRepository, ClubFactsService],
  exports: [ClubsService],
})
export class ClubsModule {}
