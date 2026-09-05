import { Module } from '@nestjs/common';
import { LinkHealthController } from './link-health.controller';
import { LinkHealthModule } from './link-health.module';

@Module({
  imports: [LinkHealthModule],
  controllers: [LinkHealthController],
})
export class LinkHealthAdminModule {}
