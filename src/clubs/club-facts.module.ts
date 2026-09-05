import { Module } from '@nestjs/common';
import { ClubFactsController } from './club-facts.controller';
import { ClubFactsRepository } from './club-facts.repository';
import { ClubFactsService } from './club-facts.service';

@Module({
  controllers: [ClubFactsController],
  providers: [ClubFactsRepository, ClubFactsService],
})
export class ClubFactsModule {}
