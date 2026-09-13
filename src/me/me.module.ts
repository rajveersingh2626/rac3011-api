import { Module, forwardRef } from '@nestjs/common';
import { ClubsModule } from '../clubs/clubs.module';
import { StorageModule } from '../storage/storage.module';
import { MeController } from './me.controller';
import { MeRepository } from './me.repository';
import { MeService } from './me.service';

@Module({
  imports: [ClubsModule, forwardRef(() => StorageModule)],
  controllers: [MeController],
  providers: [MeRepository, MeService],
  exports: [MeService],
})
export class MeModule {}
