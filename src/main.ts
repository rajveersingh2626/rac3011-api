import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/errors/http-exception.filter';
import { env } from './config/env';
import { corsOrigin } from './config/cors-origin';
import { configWarnings } from './config/config-report';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  for (const line of configWarnings(env)) app.get(Logger).warn(`config: ${line}`);
  app.set('trust proxy', true);
  app.use(helmet());
  app.use((req: any, _res: any, next: any) => {
    // Normalize and capture client IP for authentication and audit logging
    const rawForwarded = req.headers['x-forwarded-for'];
    const forwardedFirst = typeof rawForwarded === 'string' ? rawForwarded.split(',')[0].trim() : undefined;
    const clientIp =
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-client-ip'] ||
      forwardedFirst ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const cleanIp = String(clientIp).replace(/^::ffff:/, '').trim();

    if (cleanIp) {
      req.headers['x-forwarded-for'] = cleanIp;
      req.headers['x-real-ip'] = cleanIp;
    }

    if (req.method === 'POST') {
      if (req.url?.startsWith('/auth/forget-password') || req.originalUrl?.startsWith('/auth/forget-password')) {
        req.url = req.url.replace('/auth/forget-password', '/auth/request-password-reset');
      }
      if (req.url?.startsWith('/auth/request-password-reset') || req.originalUrl?.startsWith('/auth/request-password-reset')) {
        if (req.body?.email && typeof req.body.email === 'string') {
          req.body.email = req.body.email.trim().toLowerCase();
        }
      }
    }
    next();
  });
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpErrorFilter());
  // Swagger is raw express middleware, so PermissionGuard never sees it. In
  // production it published the whole admin route surface unauthenticated.
  if (env.NODE_ENV !== 'production') {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('rac3011').setVersion('1').build(),
    );
    SwaggerModule.setup('docs', app, doc);
  }
  await app.listen(env.PORT);
}
void bootstrap();
