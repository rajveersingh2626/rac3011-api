import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/errors/http-exception.filter';
import { env } from './config/env';
import { corsOrigin } from './config/cors-origin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpErrorFilter());
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('rac3011').setVersion('1').build(),
  );
  SwaggerModule.setup('docs', app, doc);
  await app.listen(env.PORT);
}
void bootstrap();
