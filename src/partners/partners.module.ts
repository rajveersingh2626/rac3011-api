import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PartnersController } from './partners.controller';
import { PartnersRepository } from './partners.repository';
import { PartnersService } from './partners.service';

@Module({
  imports: [AuditModule],
  controllers: [PartnersController],
  providers: [PartnersRepository, PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
