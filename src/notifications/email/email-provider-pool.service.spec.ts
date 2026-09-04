import { describe, expect, it } from 'vitest';
import type { EmailUsageRepository } from '../email-usage.repository';
import type { ClockPort } from './clock.port';
import {
  EmailProviderPool,
  NoEmailProviderAvailableError,
  type EmailPoolConfig,
} from './email-provider-pool.service';
import type { EmailMessage, EmailProviderName, EmailTransport } from './email-provider';

const DAY = new Date('2026-09-10T00:00:00.000Z');
const DEFAULT_CAPS: Record<EmailProviderName, number> = {
  oracle: 100,
  resend: 100,
  mailgun: 100,
  gmail: 500,
};

function config(overrides: Partial<EmailPoolConfig> = {}): EmailPoolConfig {
  return { caps: DEFAULT_CAPS, isProduction: true, allowlist: [], ...overrides };
}

function fakeClock(now: Date): ClockPort {
  return { now: () => now };
}

type FakeTransport = EmailTransport & { sent: EmailMessage[]; callCount: number; failing: boolean };

function fakeTransport(
  name: EmailProviderName,
  opts: { configured?: boolean; fail?: boolean } = {},
): FakeTransport {
  const transport: FakeTransport = {
    name,
    sent: [],
    callCount: 0,
    failing: opts.fail ?? false,
    isConfigured: () => opts.configured ?? true,
    send(message: EmailMessage) {
      transport.callCount += 1;
      if (transport.failing) return Promise.reject(new Error(`${name} send failed`));
      transport.sent.push(message);
      return Promise.resolve();
    },
  };
  return transport;
}

function fakeUsageRepo(
  initial: Partial<Record<EmailProviderName, number>> = {},
): EmailUsageRepository {
  const counts = new Map<EmailProviderName, number>(
    Object.entries(initial) as [EmailProviderName, number][],
  );
  return {
    increment(provider: EmailProviderName) {
      const next = (counts.get(provider) ?? 0) + 1;
      counts.set(provider, next);
      return Promise.resolve(next);
    },
    decrement(provider: EmailProviderName) {
      const next = Math.max((counts.get(provider) ?? 0) - 1, 0);
      counts.set(provider, next);
      return Promise.resolve(next);
    },
    usageFor: () => Promise.resolve(new Map(counts)),
  } as unknown as EmailUsageRepository;
}

const MESSAGE = { to: 'president@example.com', subject: 'Hello', html: '<p>hi</p>', text: 'hi' };

describe('EmailProviderPool', () => {
  it('sends via the first configured provider under its cap, in oracle-first order', async () => {
    const oracle = fakeTransport('oracle');
    const resend = fakeTransport('resend');
    const pool = new EmailProviderPool(fakeUsageRepo(), fakeClock(DAY), [oracle, resend], config());

    const result = await pool.send(MESSAGE);

    expect(result.provider).toBe('oracle');
    expect(oracle.sent).toHaveLength(1);
    expect(resend.sent).toHaveLength(0);
  });

  it('skips a provider once its daily cap is reached', async () => {
    const oracle = fakeTransport('oracle');
    const resend = fakeTransport('resend');
    const usage = fakeUsageRepo({ oracle: 100 });
    const pool = new EmailProviderPool(usage, fakeClock(DAY), [oracle, resend], config());

    const result = await pool.send(MESSAGE);

    expect(result.provider).toBe('resend');
    expect(oracle.sent).toHaveLength(0);
    expect(resend.sent).toHaveLength(1);
  });

  it('fails over to the next provider when a send throws, and decrements the failed count', async () => {
    const oracle = fakeTransport('oracle', { fail: true });
    const resend = fakeTransport('resend');
    const usage = fakeUsageRepo();
    const pool = new EmailProviderPool(usage, fakeClock(DAY), [oracle, resend], config());

    const result = await pool.send(MESSAGE);

    expect(result.provider).toBe('resend');
    expect(oracle.callCount).toBe(1);
    expect(oracle.sent).toHaveLength(0);
  });

  it('skips a provider that failed within the last 10 minutes, and retries it after cooldown', async () => {
    const oracle = fakeTransport('oracle', { fail: true });
    const resend = fakeTransport('resend');
    let clockNow = DAY;
    const pool = new EmailProviderPool(
      fakeUsageRepo(),
      { now: () => clockNow },
      [oracle, resend],
      config(),
    );

    await pool.send(MESSAGE);
    expect(resend.sent).toHaveLength(1);

    clockNow = new Date(DAY.getTime() + 5 * 60 * 1000);
    await pool.send(MESSAGE);
    expect(resend.sent).toHaveLength(2);
    expect(oracle.callCount).toBe(1);

    clockNow = new Date(DAY.getTime() + 11 * 60 * 1000);
    oracle.failing = false;
    const result = await pool.send(MESSAGE);
    expect(result.provider).toBe('oracle');
    expect(oracle.callCount).toBe(2);
  });

  it('skips unconfigured providers entirely', async () => {
    const oracle = fakeTransport('oracle', { configured: false });
    const resend = fakeTransport('resend');
    const pool = new EmailProviderPool(fakeUsageRepo(), fakeClock(DAY), [oracle, resend], config());

    const result = await pool.send(MESSAGE);

    expect(result.provider).toBe('resend');
    expect(oracle.callCount).toBe(0);
  });

  it('throws when every provider is at cap, cooling down or unconfigured', async () => {
    const oracle = fakeTransport('oracle', { configured: false });
    const usage = fakeUsageRepo({ resend: 100, mailgun: 100, gmail: 500 });
    const pool = new EmailProviderPool(usage, fakeClock(DAY), [oracle], config());

    await expect(pool.send(MESSAGE)).rejects.toBeInstanceOf(NoEmailProviderAvailableError);
  });

  it('refuses to send outside production when the allowlist is empty', async () => {
    const oracle = fakeTransport('oracle');
    const pool = new EmailProviderPool(
      fakeUsageRepo(),
      fakeClock(DAY),
      [oracle],
      config({ isProduction: false, allowlist: [] }),
    );

    await expect(pool.send(MESSAGE)).rejects.toThrow(/MAIL_ALLOWLIST/);
    expect(oracle.callCount).toBe(0);
  });

  it('rewrites the recipient outside production when not on the allowlist', async () => {
    const oracle = fakeTransport('oracle');
    const pool = new EmailProviderPool(
      fakeUsageRepo(),
      fakeClock(DAY),
      [oracle],
      config({ isProduction: false, allowlist: ['dev@example.com'] }),
    );

    await pool.send(MESSAGE);

    expect(oracle.sent[0].to).toBe('dev@example.com');
    expect(oracle.sent[0].subject).toContain(MESSAGE.to);
  });
});
