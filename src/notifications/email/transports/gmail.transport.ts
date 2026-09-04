import { Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { env } from '../../../config/env';
import type { EmailMessage, EmailProviderName, EmailTransport } from '../email-provider';

@Injectable()
export class GmailTransport implements EmailTransport {
  readonly name: EmailProviderName = 'gmail';
  private transporter?: Transporter;

  isConfigured(): boolean {
    return Boolean(env.GMAIL_SMTP_USER && env.GMAIL_SMTP_APP_PASSWORD);
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.isConfigured()) throw new Error('gmail transport is not configured');
    await this.client().sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }

  private client(): Transporter {
    this.transporter ??= createTransport({
      service: 'gmail',
      auth: { user: env.GMAIL_SMTP_USER, pass: env.GMAIL_SMTP_APP_PASSWORD },
    });
    return this.transporter;
  }
}
