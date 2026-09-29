import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../config/env';
import type { EmailProviderName } from './email/email-provider';

const ALERT_TO = 'tech@rotaract3011.org';
const ALERT_FROM = 'Rotaract District Portal Alerts <alerts@rotaract3011.org>';

/**
 * LimitAlertService — sends out-of-band operational alerts to the tech team.
 *
 * Deliberately bypasses EmailProviderPool to avoid circular triggering.
 * Uses Resend primary key directly (it is free-tier safe and has no daily cap in this service).
 * Falls back silently to console-only if Resend is unconfigured.
 */
@Injectable()
export class LimitAlertService {
  private readonly logger = new Logger('LimitAlertService');
  private client?: Resend;
  /** Guard against alert-storms: one alert per event key per 10 minutes */
  private readonly recentlySent = new Map<string, number>();
  private static readonly COOLDOWN_MS = 10 * 60 * 1000;

  private resendKey(): string | undefined {
    return env.RESEND_API_KEY_PRIMARY || env.RESEND_API_KEY;
  }

  /**
   * Fire an alert that an email provider has hit its daily cap.
   */
  async onEmailCapHit(provider: EmailProviderName, currentUsage: number, cap: number): Promise<void> {
    const key = `email-cap:${provider}`;
    if (this.isOnCooldown(key)) return;
    this.markSent(key);

    const subject = `[Portal Alert] Email cap reached – ${provider}`;
    const body = `
The <strong>${provider}</strong> email provider has hit its daily cap of <strong>${cap}</strong> emails.

<ul>
  <li><strong>Provider:</strong> ${provider}</li>
  <li><strong>Usage today:</strong> ${currentUsage} / ${cap}</li>
  <li><strong>Effect:</strong> This provider will be skipped; failover to the next provider in the chain is active.</li>
  <li><strong>Action:</strong> Consider raising <code>${provider.toUpperCase()}_DAILY_CAP</code> if this is unexpected.</li>
</ul>
`;
    await this.send(subject, body, `${provider} daily cap reached (${currentUsage}/${cap})`);
  }

  /**
   * Fire an alert that ALL email providers are exhausted (no email could be sent).
   */
  async onEmailPoolExhausted(to: string): Promise<void> {
    const key = 'email-pool:exhausted';
    if (this.isOnCooldown(key)) return;
    this.markSent(key);

    const subject = `[Portal Alert] CRITICAL – All email providers exhausted`;
    const body = `
<strong>All email providers in the pool failed or are at cap.</strong> An email to <code>${to}</code> could not be delivered.

<ul>
  <li><strong>Providers checked:</strong> oracle → resend → mailgun → gmail</li>
  <li><strong>Effect:</strong> Member-facing emails (OTP, notifications, access grants) are failing.</li>
  <li><strong>Immediate actions:</strong>
    <ol>
      <li>Check daily caps in the <code>.env</code> — all four may be at limit.</li>
      <li>Verify provider credentials (SMTP host / API keys) haven't expired.</li>
      <li>Consider restarting the API container to reset in-memory cooldown timers.</li>
    </ol>
  </li>
</ul>
`;
    await this.send(subject, body, `All email providers exhausted for ${to}`);
  }

  /**
   * Fire an alert that a storage adapter threw an error.
   */
  async onStorageError(adapter: 'uploadthing' | 'r2', operation: string, err: Error): Promise<void> {
    const key = `storage:${adapter}:${operation}`;
    if (this.isOnCooldown(key)) return;
    this.markSent(key);

    const subject = `[Portal Alert] Storage error – ${adapter} / ${operation}`;
    const body = `
A storage error occurred in the <strong>${adapter}</strong> adapter during <strong>${operation}</strong>.

<ul>
  <li><strong>Adapter:</strong> ${adapter}</li>
  <li><strong>Operation:</strong> ${operation}</li>
  <li><strong>Error:</strong> <code>${err.message}</code></li>
  <li><strong>Effect:</strong> File uploads/downloads using this adapter may be failing for users.</li>
  <li><strong>Actions:</strong>
    <ol>
      <li>Check the UploadThing dashboard / Cloudflare R2 dashboard for quota or availability issues.</li>
      <li>Review full API logs for the stack trace.</li>
    </ol>
  </li>
</ul>
`;
    await this.send(subject, body, `${adapter} ${operation} error: ${err.message}`);
  }

  // ─── internals ───────────────────────────────────────────────────────────────

  private async send(subject: string, bodyHtml: string, plainSummary: string): Promise<void> {
    const key = this.resendKey();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
  <div style="border-left:4px solid #ef4444;padding:12px 16px;background:#fef2f2;margin-bottom:20px;border-radius:4px;">
    <strong style="color:#b91c1c;font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Rotaract District Organisation 3011 — System Alert</strong>
  </div>
  <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;">${subject.replace('[Portal Alert] ', '')}</h2>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="font-size:11px;color:#94a3b8;margin:0;">This is an automated alert from the District Portal API. Do not reply to this message.</p>
</body>
</html>`;

    const text = `Rotaract District Organisation 3011 — System Alert\n\n${subject}\n\n${plainSummary}\n\nThis is an automated alert from the District Portal API.`;

    if (!key) {
      this.logger.warn(`[LimitAlert] Resend not configured — alert dropped: ${subject}`);
      return;
    }

    try {
      this.client ??= new Resend(key);
      const result = await this.client.emails.send({
        from: ALERT_FROM,
        to: [ALERT_TO],
        subject,
        html,
        text,
      });
      if (result.error) {
        this.logger.error(`[LimitAlert] Resend rejected alert: ${JSON.stringify(result.error)}`);
      } else {
        this.logger.log(`[LimitAlert] Alert sent to ${ALERT_TO} — ${subject}`);
      }
    } catch (err: unknown) {
      // Never throw — alerts must not take down the caller
      this.logger.error(`[LimitAlert] Failed to send alert: ${(err as Error).message}`);
    }
  }

  private isOnCooldown(key: string): boolean {
    const last = this.recentlySent.get(key);
    return last !== undefined && Date.now() - last < LimitAlertService.COOLDOWN_MS;
  }

  private markSent(key: string): void {
    this.recentlySent.set(key, Date.now());
  }
}
