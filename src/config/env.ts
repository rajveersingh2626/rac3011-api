import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v));
const intWithDefault = (def: number) =>
  z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.coerce.number().int().nonnegative().default(def),
  );
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
  ORACLE_SMTP_HOST: optionalString,
  ORACLE_SMTP_PORT: intWithDefault(587),
  ORACLE_SMTP_USER: optionalString,
  ORACLE_SMTP_PASSWORD: optionalString,
  ORACLE_DAILY_CAP: intWithDefault(100),
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
  // Dev/test fallback only ("de" x32); every non-local environment must set a real 32-byte hex key.
  DRISHTI_PII_KEY: optionalString
    .pipe(
      z
        .string()
        .regex(/^[0-9a-fA-F]{64}$/)
        .optional(),
    )
    .transform((v): string => v ?? 'de'.repeat(32)),
  STORAGE_DRIVER: z.enum(['live', 'stub']).default('stub'),
  ASSIST_DRIVER: z.enum(['live', 'stub']).default('stub'),
  UPLOADTHING_TOKEN_PERMANENT: optionalString,
  UPLOADTHING_TOKEN_DYNAMIC: optionalString,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET_PRIVATE: z.string().default('rac3011-private'),
  R2_BUCKET_BACKUPS: z.string().default('rac3011-backups'),
  SENTRY_DSN: optionalString,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CLOUDFLARE_API_EMAIL: optionalString,
  CLOUDFLARE_API_KEY: optionalString,
  CLOUDFLARE_ZONE_ID: optionalString,
  CACHE_INVALIDATION: z.enum(['on', 'off']).default('on'),
  SITE_REBUILD_ENABLED: z.enum(['on', 'off']).default('off'),
  SITE_REBUILD_GITHUB_TOKEN: optionalString,
  SITE_REBUILD_REPO: z.string().default('round-robin-solutions/rac3011-web'),
  SITE_REBUILD_WORKFLOW: z.string().default('ci.yml'),
  SITE_REBUILD_DEBOUNCE_MS: intWithDefault(300000),
  SEED_DEV: z
    .string()
    .optional()
    .transform((v) => v === '1'),
  GLOBAL_OTP: optionalString,
  NOTIFICATIONS_RETRY_DELAY_MS: intWithDefault(30000),
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
    if (env.DRISHTI_PII_KEY === 'de'.repeat(32)) missing.push('DRISHTI_PII_KEY');
    if (env.WEB_ORIGINS.length === 0) missing.push('WEB_ORIGINS');
    if (env.STORAGE_DRIVER === 'live') {
      if (!env.UPLOADTHING_TOKEN_PERMANENT) missing.push('UPLOADTHING_TOKEN_PERMANENT');
      if (!env.UPLOADTHING_TOKEN_DYNAMIC) missing.push('UPLOADTHING_TOKEN_DYNAMIC');
      for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const) {
        if (!env[k]) missing.push(k);
      }
    }
    if (missing.length)
      throw new Error(`Invalid environment: production requires ${missing.join(', ')}`);
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
