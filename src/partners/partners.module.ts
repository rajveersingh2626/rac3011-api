import { Module } from '@nestjs/common';
import { PartnersRepository } from './partners.repository';
import { PartnersService } from './partners.service';

@Module({
  providers: [PartnersRepository, PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
