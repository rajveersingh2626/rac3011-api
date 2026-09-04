import request from 'supertest';
import { createTestApp, httpServer } from '../test/app';

async function main() {
  const app = await createTestApp();
  const health = await request(httpServer(app)).get('/health');
  console.log('HEALTH', health.status);
  const home = await request(httpServer(app)).get('/public/home');
  console.log('PUBLIC HOME', home.status, JSON.stringify(home.body).slice(0, 500));
  const drrs = await request(httpServer(app)).get('/public/past-drrs');
  console.log('PAST DRRS', drrs.status, (drrs.body as { items: unknown[] }).items?.length);
  const enquiry = await request(httpServer(app))
    .post('/public/enquiries')
    .send({ kind: 'contact', name: 'Test', email: 'test@example.com', message: 'hello' });
  console.log('ENQUIRY', enquiry.status, JSON.stringify(enquiry.body));
  await app.close();
}
main().catch((e) => {
  console.error('BOOT ERROR', e);
  process.exit(1);
});
