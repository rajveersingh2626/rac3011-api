import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { bullRootOptions } from '../cache/redis.provider';
import { ConsoleNotificationAdapter } from './console-notification.adapter';
import { EmailUsageRepository } from './email-usage.repository';
import { ClockPort, SystemClock } from './email/clock.port';
import {
  EmailProviderPool,
  emailPoolConfigProvider,
  emailTransportsProvider,
} from './email/email-provider-pool.service';
import { FakeEmailTransport } from './email/transports/fake.transport';
import { GmailTransport } from './email/transports/gmail.transport';
import { MailgunTransport } from './email/transports/mailgun.transport';
import { OracleTransport } from './email/transports/oracle.transport';
import { ResendTransport } from './email/transports/resend.transport';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationOutboxRepository } from './notification-outbox.repository';
import { NotificationSendProcessor } from './notification-send.processor';
import { NotificationSweepScheduler } from './notification-sweep.scheduler';
import { NotificationPort } from './notification.port';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';

@Global()
@Module({
  imports: [
    BullModule.forRoot(bullRootOptions()),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [
    ConsoleNotificationAdapter,
    NotificationDispatchService,
    { provide: NotificationPort, useExisting: NotificationDispatchService },
    EmailUsageRepository,
    { provide: ClockPort, useClass: SystemClock },
    OracleTransport,
    ResendTransport,
    MailgunTransport,
    GmailTransport,
    FakeEmailTransport,
    emailTransportsProvider,
    emailPoolConfigProvider,
    EmailProviderPool,
    NotificationOutboxRepository,
    NotificationSendProcessor,
    NotificationSweepScheduler,
  ],
  exports: [NotificationPort, ConsoleNotificationAdapter, EmailProviderPool],
})
export class NotificationsModule {}
