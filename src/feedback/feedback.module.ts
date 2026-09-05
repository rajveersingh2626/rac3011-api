import { Module } from '@nestjs/common';
import { MeModule } from '../me/me.module';
import { SettingsModule } from '../settings/settings.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackRepository } from './feedback.repository';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [MeModule, SettingsModule],
  controllers: [FeedbackController],
  providers: [FeedbackRepository, FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
