import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { ClubsModule } from './clubs/clubs.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { LinkHealthModule } from './link-health/link-health.module';
import { MeModule } from './me/me.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';
import { RbacModule } from './rbac/rbac.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { env } from './config/env';

const workerModules = [
  PrismaModule,
  CacheModule,
  CommonModule,
  NotificationsModule,
  StorageModule,
  LinkHealthModule,
  HealthModule,
];
const httpModules = [
  PrismaModule,
  CacheModule,
  CommonModule,
  NotificationsModule,
  StorageModule,
  AuthModule,
  RbacModule,
  AuditModule,
  MeModule,
  ClubsModule,
  HealthModule,
  PublicModule,
  ReportsModule,
];

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: { level: env.LOG_LEVEL, autoLogging: env.NODE_ENV !== 'test' },
    }),
    EventEmitterModule.forRoot(),
    ...(env.WORKER ? workerModules : httpModules),
  ],
})
export class AppModule {}
