import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../../../config/env';
import type { EmailMessage, EmailProviderName, EmailTransport } from '../email-provider';

@Injectable()
export class ResendTransport implements EmailTransport {
  readonly name: EmailProviderName = 'resend';
  private resend?: Resend;

  isConfigured(): boolean {
    return Boolean(env.RESEND_API_KEY);
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.isConfigured()) throw new Error('resend transport is not configured');
    const result = await this.client().emails.send({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (result.error) throw new Error(`resend send failed: ${result.error.message}`);
  }

  private client(): Resend {
    this.resend ??= new Resend(env.RESEND_API_KEY);
    return this.resend;
  }
}
