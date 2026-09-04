import { execFileSync } from 'node:child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | undefined;

export async function setup(): Promise<void> {
  container = await new PostgreSqlContainer('postgres:18')
    .withDatabase('rac3011')
    .withUsername('rac3011')
    .withPassword('rac3011')
    .start();
  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  process.env.TEST_DATABASE_URL = url;
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
