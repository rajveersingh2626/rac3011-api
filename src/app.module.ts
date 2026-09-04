import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { StorageModule } from './storage/storage.module';
import { env } from './config/env';

const workerModules = [PrismaModule, CommonModule, NotificationsModule, StorageModule];
const httpModules = [
  PrismaModule,
  CommonModule,
  NotificationsModule,
  StorageModule,
  AuthModule,
  RbacModule,
  AuditModule,
  MeModule,
  ClubsModule,
  HealthModule,
];

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: { level: env.LOG_LEVEL, autoLogging: env.NODE_ENV !== 'test' },
    }),
    ...(env.WORKER ? workerModules : httpModules),
  ],
})
export class AppModule {}
