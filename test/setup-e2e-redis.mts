// Keeps flushdb() in cache.e2e.ts/public-performance.e2e.ts from wiping another file's in-flight
// BullMQ job. Must run before env.ts is first imported (env.REDIS_URL is a load-time singleton).
const rawUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const url = new URL(rawUrl);
url.pathname = `/${process.pid % 16}`;
process.env.REDIS_URL = url.toString();

const { env } = await import('../src/config/env.js');
if (env.REDIS_URL !== url.toString()) {
  throw new Error(
    `setup-e2e-redis: env.ts was already loaded before this ran (env.REDIS_URL=${env.REDIS_URL}, ` +
      `expected ${url.toString()}). The pid-keyed Redis DB scoping did not take effect.`,
  );
}
