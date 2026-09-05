import { Inject, Injectable } from '@nestjs/common';
import { env } from '../../config/env';
import { EmailUsageRepository } from '../email-usage.repository';
import { ClockPort } from './clock.port';
import { PROVIDER_ORDER, type EmailProviderName, type EmailTransport } from './email-provider';
import { rewriteRecipient } from './recipient-rewrite';
import { FakeEmailTransport } from './transports/fake.transport';
import { GmailTransport } from './transports/gmail.transport';
import { MailgunTransport } from './transports/mailgun.transport';
import { OracleTransport } from './transports/oracle.transport';
import { ResendTransport } from './transports/resend.transport';

const FAILURE_COOLDOWN_MS = 10 * 60 * 1000;

export type EmailPoolMessage = { to: string; subject: string; html: string; text: string };
export type EmailPoolResult = { provider: EmailProviderName };
export type EmailPoolConfig = {
  caps: Record<EmailProviderName, number>;
  isProduction: boolean;
  allowlist: readonly string[];
};

export class NoEmailProviderAvailableError extends Error {
  constructor() {
    super('No email provider is available (all at cap, cooling down, or unconfigured)');
  }
}

export const EMAIL_TRANSPORTS = 'EMAIL_TRANSPORTS';
export const EMAIL_POOL_CONFIG = 'EMAIL_POOL_CONFIG';

@Injectable()
export class EmailProviderPool {
  private readonly failedAt = new Map<EmailProviderName, number>();

  constructor(
    @Inject(EmailUsageRepository) private readonly usage: EmailUsageRepository,
    @Inject(ClockPort) private readonly clock: ClockPort,
    @Inject(EMAIL_TRANSPORTS) private readonly transports: readonly EmailTransport[],
    @Inject(EMAIL_POOL_CONFIG) private readonly config: EmailPoolConfig,
  ) {}

  async send(message: EmailPoolMessage): Promise<EmailPoolResult> {
    const rewritten = rewriteRecipient({
      to: message.to,
      subject: message.subject,
      isProduction: this.config.isProduction,
      allowlist: this.config.allowlist,
    });
    if (rewritten.kind === 'refuse') throw new Error(rewritten.reason);

    const day = startOfDay(this.clock.now());
    const usage = await this.usage.usageFor(day);

    for (const name of PROVIDER_ORDER) {
      const transport = this.transports.find((t) => t.name === name);
      if (!transport || !transport.isConfigured()) continue;
      if ((usage.get(name) ?? 0) >= this.config.caps[name]) continue;
      if (this.isCoolingDown(name)) continue;

      await this.usage.increment(name, day);
      try {
        await transport.send({
          to: rewritten.to,
          subject: rewritten.subject,
          html: message.html,
          text: message.text,
          from: env.MAIL_FROM,
        });
        return { provider: name };
      } catch {
        await this.usage.decrement(name, day);
        this.failedAt.set(name, this.clock.now().getTime());
      }
    }
    throw new NoEmailProviderAvailableError();
  }

  private isCoolingDown(name: EmailProviderName): boolean {
    const failedAt = this.failedAt.get(name);
    return failedAt !== undefined && this.clock.now().getTime() - failedAt < FAILURE_COOLDOWN_MS;
  }
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const emailTransportsProvider = {
  provide: EMAIL_TRANSPORTS,
  useFactory: (
    oracle: OracleTransport,
    resend: ResendTransport,
    mailgun: MailgunTransport,
    gmail: GmailTransport,
    fake: FakeEmailTransport,
  ): EmailTransport[] => (env.NODE_ENV === 'test' ? [fake] : [oracle, resend, mailgun, gmail]),
  inject: [OracleTransport, ResendTransport, MailgunTransport, GmailTransport, FakeEmailTransport],
};

export const emailPoolConfigProvider = {
  provide: EMAIL_POOL_CONFIG,
  useFactory: (): EmailPoolConfig => ({
    caps: {
      oracle: env.ORACLE_DAILY_CAP,
      resend: env.RESEND_DAILY_CAP,
      mailgun: env.MAILGUN_DAILY_CAP,
      gmail: env.GMAIL_DAILY_CAP,
    },
    isProduction: env.NODE_ENV === 'production',
    allowlist: env.MAIL_ALLOWLIST,
  }),
};
