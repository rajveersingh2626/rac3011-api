import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '../src/app.module';
import { HttpErrorFilter } from '../src/common/errors/http-exception.filter';

export async function createTestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpErrorFilter());
  await app.init();
  return app;
}

export function httpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}
