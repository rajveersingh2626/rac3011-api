import { z } from 'zod';

const optionalString = z.string().trim().optional().transform((v) => (v === '' ? undefined : v));
const intWithDefault = (def: number) => z.coerce.number().int().nonnegative().default(def);
const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  WORKER: z
    .string()
    .optional()
    .transform((v) => v === '1'),
  DATABASE_URL: z.string().url().default('postgresql://rac3011:rac3011@localhost:5434/rac3011'),
  SHADOW_DATABASE_URL: optionalString,
  REDIS_URL: z.string().default('redis://localhost:6379'),
  AUTH_SECRET: z.string().min(32).default('dev-only-secret-change-me-please-32-bytes-min'),
  AUTH_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  WEB_ORIGINS: csv,
  MAIL_DRIVER: z.enum(['console', 'pool']).default('console'),
  MAIL_FROM: z.string().default('Rotaract District 3011 <no-reply@rotaract3011.org>'),
  MAIL_ALLOWLIST: csv,
  RESEND_API_KEY: optionalString,
  RESEND_DAILY_CAP: intWithDefault(100),
  MAILGUN_API_KEY: optionalString,
  MAILGUN_DOMAIN: optionalString,
  MAILGUN_DAILY_CAP: intWithDefault(100),
  GMAIL_SMTP_USER: optionalString,
  GMAIL_SMTP_APP_PASSWORD: optionalString,
  GMAIL_DAILY_CAP: intWithDefault(500),
  VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: z.string().default('mailto:no-reply@rotaract3011.org'),
  GOOGLE_SERVICE_ACCOUNT_JSON_B64: optionalString,
  DRR_CALENDAR_ID: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),
  DRISHTI_PII_KEY: optionalString.pipe(z.string().regex(/^[0-9a-fA-F]{64}$/).optional()),
  SENTRY_DSN: optionalString,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SEED_DEV: z
    .string()
    .optional()
    .transform((v) => v === '1'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join('\n')}`);
  }
  const env = result.data;
  if (env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (env.AUTH_SECRET.startsWith('dev-only')) missing.push('AUTH_SECRET');
    if (env.WEB_ORIGINS.length === 0) missing.push('WEB_ORIGINS');
    if (missing.length) throw new Error(`Invalid environment: production requires ${missing.join(', ')}`);
  }
  return env;
}

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(1);
  }
}

export const env: Env = loadEnv();
