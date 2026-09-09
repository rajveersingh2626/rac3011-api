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
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use((req: any, _res: any, next: any) => {
    if (req.method === 'POST' && (req.url === '/auth/forget-password' || req.originalUrl === '/auth/forget-password')) {
      req.url = '/auth/request-password-reset';
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
