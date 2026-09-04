import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConsoleNotificationAdapter } from '../src/notifications/console-notification.adapter';
import { httpServer } from './app';
import { TEST_PASSWORD } from './fixtures';

export type TestAgent = ReturnType<typeof request.agent>;

export async function signInAndVerify(app: INestApplication, email: string): Promise<TestAgent> {
  const agent = request.agent(httpServer(app));
  await agent.post('/auth/sign-in/email').send({ email, password: TEST_PASSWORD }).expect(200);
  await agent.post('/second-factor/resend').expect(201);

  const adapter = app.get(ConsoleNotificationAdapter);
  const otpNotification = adapter.lastFor(email, 'otp');
  const otp = otpNotification?.data.otp as string | undefined;
  if (!otp) throw new Error(`no otp was sent to ${email}`);

  await agent.post('/second-factor/verify').send({ method: 'email', code: otp }).expect(201);
  return agent;
}
