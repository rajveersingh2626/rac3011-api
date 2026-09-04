import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false, bodyParser: false });
  await app.init();
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('rac3011').setVersion('1').build(),
  );
  writeFileSync('openapi.json', JSON.stringify(doc, null, 2));
  await app.close();
  console.log('wrote openapi.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
