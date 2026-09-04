import { Global, Module } from '@nestjs/common';
import { ConsoleNotificationAdapter } from './console-notification.adapter';
import { EmailUsageRepository } from './email-usage.repository';
import { ClockPort, SystemClock } from './email/clock.port';
import {
  EmailProviderPool,
  emailPoolConfigProvider,
  emailTransportsProvider,
} from './email/email-provider-pool.service';
import { GmailTransport } from './email/transports/gmail.transport';
import { MailgunTransport } from './email/transports/mailgun.transport';
import { OracleTransport } from './email/transports/oracle.transport';
import { ResendTransport } from './email/transports/resend.transport';
import { NotificationPort } from './notification.port';

@Global()
@Module({
  providers: [
    ConsoleNotificationAdapter,
    { provide: NotificationPort, useExisting: ConsoleNotificationAdapter },
    EmailUsageRepository,
    { provide: ClockPort, useClass: SystemClock },
    OracleTransport,
    ResendTransport,
    MailgunTransport,
    GmailTransport,
    emailTransportsProvider,
    emailPoolConfigProvider,
    EmailProviderPool,
  ],
  exports: [NotificationPort, ConsoleNotificationAdapter, EmailProviderPool],
})
export class NotificationsModule {}
