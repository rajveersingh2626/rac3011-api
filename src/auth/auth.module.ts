import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuditService } from '../audit/audit.service';
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
      inject: [PrismaAuthAdapterService, NotificationPort, AuditService],
      useFactory: (adapter: PrismaAuthAdapterService, notifications: NotificationPort, audit: AuditService) => ({
        auth: createAuthInstance({
          database: adapter.create(),
          onSessionCreated: async (session) => {
            try {
              await audit.record({
                actorId: session.userId ?? null,
                action: 'auth.login',
                resourceType: 'session',
                resourceId: session.id ?? null,
                after: {
                  ipAddress: session.ipAddress ?? null,
                  userAgent: session.userAgent ?? null,
                },
              });
            } catch (err) {
              console.error('[AUTH] Failed to record login audit log:', (err as Error).message);
            }
          },
          onSessionDeleted: async (session) => {
            try {
              await audit.record({
                actorId: session.userId ?? null,
                action: 'auth.logout',
                resourceType: 'session',
                resourceId: session.id ?? null,
              });
            } catch (err) {
              console.error('[AUTH] Failed to record logout audit log:', (err as Error).message);
            }
          },
          sendOtpEmail: async ({ email, otp, type }) => {
            try {
              await audit.record({
                actorId: null,
                action: 'auth.otp_requested',
                resourceType: 'auth',
                after: { email, type },
              });
            } catch {}
            return notifications.notify({ template: 'otp', to: [{ email }], data: { otp, type } });
          },
          sendResetPasswordEmail: async ({ email, name, token, url }) => {
            try {
              await audit.record({
                actorId: null,
                action: 'auth.password_reset_requested',
                resourceType: 'auth',
                after: { email },
              });
            } catch {}
            const webOrigin = env.WEB_ORIGINS[0] || 'https://rotaract3011.org';
            let resolvedToken = token;
            if (!resolvedToken && url) {
              try {
                const parsed = new URL(url);
                resolvedToken = parsed.searchParams.get('token') || '';
              } catch {
                resolvedToken = '';
              }
            }
            const resetUrl = `${webOrigin}/portal/reset-password?token=${encodeURIComponent(resolvedToken)}`;
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
