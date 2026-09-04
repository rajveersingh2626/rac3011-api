import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { NotificationPort } from '../notifications/notification.port';
import { PrismaAuthAdapterService } from '../prisma/prisma-auth-adapter.service';
import { SessionContextPort } from '../common/auth/session-context.port';
import { createAuthInstance } from './auth.config';
import { AuthRepository } from './auth.repository';
import { SecondFactorController } from './second-factor.controller';
import { SecondFactorService } from './second-factor.service';
import { SessionContextAdapter } from './session-context.adapter';
import { TrustedDevicesController } from './trusted-devices.controller';
import { TrustedDevicesService } from './trusted-devices.service';

@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      disableGlobalAuthGuard: true,
      inject: [PrismaAuthAdapterService, NotificationPort],
      useFactory: (adapter: PrismaAuthAdapterService, notifications: NotificationPort) => ({
        auth: createAuthInstance({
          database: adapter.create(),
          sendOtpEmail: ({ email, otp, type }) =>
            notifications.notify({ template: 'otp', to: [{ email }], data: { otp, type } }),
        }),
      }),
    }),
  ],
  controllers: [SecondFactorController, TrustedDevicesController],
  providers: [
    AuthRepository,
    SecondFactorService,
    TrustedDevicesService,
    { provide: SessionContextPort, useClass: SessionContextAdapter },
  ],
  exports: [SessionContextPort],
})
export class AuthModule {}
