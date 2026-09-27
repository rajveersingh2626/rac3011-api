import { Injectable } from '@nestjs/common';
import { env } from '../../../config/env';
import type { EmailMessage, EmailProviderName, EmailTransport } from '../email-provider';

@Injectable()
export class MailgunTransport implements EmailTransport {
  readonly name: EmailProviderName = 'mailgun';

  isConfigured(): boolean {
    return Boolean(env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN);
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.isConfigured()) throw new Error('mailgun transport is not configured');
    const params: Record<string, string> = {
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    };
    if (message.replyTo) params['h:Reply-To'] = message.replyTo;
    if (message.cc && message.cc.length > 0) params['cc'] = message.cc.join(', ');
    const body = new URLSearchParams(params);
    const auth = Buffer.from(`api:${env.MAILGUN_API_KEY ?? ''}`).toString('base64');
    const response = await fetch(
      `https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN ?? ''}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`mailgun send failed: ${response.status} ${detail}`);
    }
  }
}
