import { Injectable, Logger } from '@nestjs/common';
import { NotificationPort, NotifyInput } from './notification.port';

@Injectable()
export class ConsoleNotificationAdapter extends NotificationPort {
  private readonly logger = new Logger('Notifications');
  readonly sent: NotifyInput[] = [];

  notify(input: NotifyInput): Promise<void> {
    this.sent.push(input);
    if (this.sent.length > 200) this.sent.shift();
    const to = input.to.map((t) => t.email ?? t.userId).join(', ');
    this.logger.log(`[${input.template}] -> ${to} ${JSON.stringify(input.data)}`);
    return Promise.resolve();
  }

  lastFor(email: string, template: NotifyInput['template']): NotifyInput | undefined {
    return [...this.sent]
      .reverse()
      .find((n) => n.template === template && n.to.some((t) => t.email === email));
  }
}
