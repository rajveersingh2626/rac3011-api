import { Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { env } from '../../../config/env';
import type { EmailMessage, EmailProviderName, EmailTransport } from '../email-provider';

@Injectable()
export class OracleTransport implements EmailTransport {
  readonly name: EmailProviderName = 'oracle';
  private transporter?: Transporter;

  isConfigured(): boolean {
    return Boolean(env.ORACLE_SMTP_HOST && env.ORACLE_SMTP_USER && env.ORACLE_SMTP_PASSWORD);
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.isConfigured()) throw new Error('oracle transport is not configured');
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
      host: env.ORACLE_SMTP_HOST,
      port: env.ORACLE_SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: { user: env.ORACLE_SMTP_USER, pass: env.ORACLE_SMTP_PASSWORD },
    });
    return this.transporter;
  }
}
