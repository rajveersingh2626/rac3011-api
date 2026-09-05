import { Injectable } from '@nestjs/common';
import type { EmailMessage, EmailProviderName, EmailTransport } from '../email-provider';

@Injectable()
export class FakeEmailTransport implements EmailTransport {
  readonly name: EmailProviderName = 'oracle';
  readonly sent: EmailMessage[] = [];
  failNext = 0;

  isConfigured(): boolean {
    return true;
  }

  send(message: EmailMessage): Promise<void> {
    if (this.failNext > 0) {
      this.failNext -= 1;
      return Promise.reject(new Error('fake transport forced failure'));
    }
    this.sent.push(message);
    return Promise.resolve();
  }
}
