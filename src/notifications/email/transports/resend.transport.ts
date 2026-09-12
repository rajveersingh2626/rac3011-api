import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../../../config/env';
import type { EmailMessage, EmailProviderName, EmailTransport } from '../email-provider';

@Injectable()
export class ResendTransport implements EmailTransport {
  readonly name: EmailProviderName = 'resend';
  private readonly logger = new Logger('ResendTransport');

  private primaryClient?: Resend;
  private fallbackClient?: Resend;

  get primaryKey(): string | undefined {
    return env.RESEND_API_KEY_PRIMARY || env.RESEND_API_KEY;
  }

  get fallbackKey(): string | undefined {
    return env.RESEND_API_KEY_FALLBACK;
  }

  isConfigured(): boolean {
    return Boolean(this.primaryKey || this.fallbackKey);
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.isConfigured()) throw new Error('resend transport is not configured');

    const primaryKey = this.primaryKey;
    const fallbackKey = this.fallbackKey;

    let lastError: any = null;

    const attemptSend = async (client: Resend, keyLabel: string): Promise<boolean> => {
      try {
        this.logger.log(`[Resend] Attempting dispatch via ${keyLabel} to: ${message.to} from: ${message.from}`);
        const result = await client.emails.send({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        });

        if (result.error) {
          const { statusCode, message: errMsg, name: errName } = result.error as any;
          console.error(`[Resend Error - ${keyLabel}] Status: ${statusCode} | Name: ${errName} | Message: ${errMsg}`);
          this.logger.error(`[Resend ${keyLabel}] Failed to ${message.to}: Status ${statusCode} (${errName}) - ${errMsg}`);

          // If domain unverified (403), retry using verified onboarding address
          if (statusCode === 403 || String(errMsg).includes('domain is not verified')) {
            console.warn(`[Resend] Domain ${message.from} not verified. Attempting fallback to onboarding@resend.dev...`);
            const devResult = await client.emails.send({
              from: 'Rotaract District 3011 <onboarding@resend.dev>',
              to: [message.to],
              subject: message.subject,
              html: message.html,
              text: message.text,
            });

            if (devResult.error) {
              const { statusCode: devStatus, message: devMsg, name: devName } = devResult.error as any;
              console.error(`[Resend Dev Fallback Error - ${keyLabel}] Status: ${devStatus} | Name: ${devName} | Message: ${devMsg}`);
              lastError = devResult.error;
              return false;
            }

            console.log(`[Resend Success - ${keyLabel}] Sent via onboarding@resend.dev (ID: ${devResult.data?.id})`);
            return true;
          }

          lastError = result.error;
          return false;
        }

        console.log(`[Resend Success - ${keyLabel}] Delivered successfully (ID: ${result.data?.id})`);
        return true;
      } catch (err: any) {
        console.error(`[Resend Exception - ${keyLabel}] Error: ${err?.message || err}`);
        this.logger.error(`[Resend ${keyLabel}] Exception during dispatch: ${err?.message || err}`);
        lastError = err;
        return false;
      }
    };

    // 1. Try Primary Key
    if (primaryKey) {
      this.primaryClient ??= new Resend(primaryKey);
      const success = await attemptSend(this.primaryClient, 'PRIMARY');
      if (success) return;
    }

    // 2. Automated fallback to Secondary Key on any failure (401/403/rate limit/error)
    if (fallbackKey && fallbackKey !== primaryKey) {
      console.warn(`[Resend] Primary API key failed. Immediately attempting FALLBACK key...`);
      this.fallbackClient ??= new Resend(fallbackKey);
      const success = await attemptSend(this.fallbackClient, 'FALLBACK');
      if (success) return;
    }

    const errDetail = lastError?.message || JSON.stringify(lastError);
    throw new Error(`Resend email dispatch failed across all configured keys: ${errDetail}`);
  }
}
