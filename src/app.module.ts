import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { ClubFactsModule } from './clubs/club-facts.module';
import { ClubsModule } from './clubs/clubs.module';
import { CommonModule } from './common/common.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthModule } from './health/health.module';
import { LinkHealthModule } from './link-health/link-health.module';
import { LinkHealthAdminModule } from './link-health/link-health-admin.module';
import { MeModule } from './me/me.module';
import { MembersModule } from './members/members.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PointsModule } from './points/points.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';
import { RbacModule } from './rbac/rbac.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { SisterClubRequestsModule } from './sister-club-requests/sister-club-requests.module';
import { StorageModule } from './storage/storage.module';
import { CareerbridgeModule } from './subdomains/careerbridge/careerbridge.module';
import { DrishtiModule } from './subdomains/drishti/drishti.module';
import { Mission3011Module } from './subdomains/mission3011/mission3011.module';
import { RideModule } from './subdomains/ride/ride.module';
import { RclModule } from './subdomains/rcl/rcl.module';
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
  MembersModule,
  ClubsModule,
  ClubFactsModule,
  FeedbackModule,
  HealthModule,
  PublicModule,
  ReportsModule,
  PointsModule,
  SettingsModule,
  LinkHealthAdminModule,
  SisterClubRequestsModule,
  Mission3011Module,
  DrishtiModule,
  RideModule,
  CareerbridgeModule,
  RclModule,
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
