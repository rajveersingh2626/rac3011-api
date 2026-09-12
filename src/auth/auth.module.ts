import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { NotificationPort } from '../notifications/notification.port';
import { PrismaAuthAdapterService } from '../prisma/prisma-auth-adapter.service';
import { SessionContextPort } from '../common/auth/session-context.port';
import { env } from '../config/env';
import { createAuthInstance } from './auth.config';
import { AuthLookupController } from './auth-lookup.controller';
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
          sendResetPasswordEmail: async ({ email, name, token, url }) => {
            const webOrigin = env.WEB_ORIGINS[0] || 'https://rotaract3011.org';
            const resetUrl = url || `${webOrigin}/portal/reset-password?token=${encodeURIComponent(token)}`;
            console.log(`[AUTH] Dispatching password reset email to: ${email}, URL: ${resetUrl}`);
            try {
              await notifications.notify({
                template: 'password-reset',
                to: [{ email }],
                data: { name, url: resetUrl },
              });
              console.log(`[AUTH] Password reset notification queued for ${email}`);
            } catch (err: any) {
              console.error(`[AUTH] Failed to dispatch password reset email to ${email}:`, err?.message || err);
              throw err;
            }
          },
        }),
      }),
    }),
  ],
  controllers: [SecondFactorController, TrustedDevicesController, AuthLookupController],
  providers: [
    AuthRepository,
    SecondFactorService,
    TrustedDevicesService,
    { provide: SessionContextPort, useClass: SessionContextAdapter },
  ],
  exports: [SessionContextPort],
})
export class AuthModule {}
