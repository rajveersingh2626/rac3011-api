import { Global, Module } from '@nestjs/common';
import { ConsoleNotificationAdapter } from './console-notification.adapter';
import { NotificationPort } from './notification.port';

@Global()
@Module({
  providers: [ConsoleNotificationAdapter, { provide: NotificationPort, useExisting: ConsoleNotificationAdapter }],
  exports: [NotificationPort, ConsoleNotificationAdapter],
})
export class NotificationsModule {}
