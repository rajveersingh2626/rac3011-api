import { betterAuth } from 'better-auth';
import type { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP, twoFactor } from 'better-auth/plugins';
import { env } from '../config/env';
import { hashPassword, verifyPassword } from './legacy-password';

export type SendOtpEmail = (input: { email: string; otp: string; type: string }) => Promise<void>;
export type SendResetPasswordEmail = (input: { email: string; name: string; url: string; token: string }) => Promise<void>;
export type OnSessionAction = (session: { id?: string; userId?: string; ipAddress?: string | null; userAgent?: string | null }, context?: unknown) => Promise<void>;

export type AuthConfigDeps = {
  database: ReturnType<typeof prismaAdapter>;
  sendOtpEmail: SendOtpEmail;
  sendResetPasswordEmail?: SendResetPasswordEmail;
  onSessionCreated?: OnSessionAction;
  onSessionDeleted?: OnSessionAction;
};

export function createAuthInstance(deps: AuthConfigDeps) {
  return betterAuth({
    database: deps.database,
    basePath: '/auth',
    secret: env.AUTH_SECRET,
    baseURL: env.AUTH_URL,
    trustedOrigins: Array.from(
      new Set([
        ...env.WEB_ORIGINS,
        'https://rotaract3011.org',
        'https://*.rotaract3011.org',
        'https://testing.rotaract3011.org',
        'https://*.testing.rotaract3011.org',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:4173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://140.245.6.54',
      ]),
    ),
    emailAndPassword: {
      enabled: true,
      password: { hash: hashPassword, verify: verifyPassword },
      async sendResetPassword({ user, url, token }) {
        if (deps.sendResetPasswordEmail) {
          await deps.sendResetPasswordEmail({
            email: user.email,
            name: user.name,
            url,
            token,
          });
        }
      },
    },
    session: {
      expiresIn: 60 * 60 * 2, // 2 hours (7,200 seconds)
      updateAge: 60 * 30, // 30 minute rolling refresh threshold
      additionalFields: {
        mfaPending: { type: 'boolean', required: false, input: false, defaultValue: true },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // twoFactor issues a fresh session on a verified TOTP check; without this it'd inherit
          // mfaPending:true and stay stuck behind SecondFactorStage forever.
          before: (session: any, context: any) => {
            const updates: Record<string, any> = {};
            if (context?.path === '/two-factor/verify-totp') {
              updates.mfaPending = false;
            }
            if (!session?.ipAddress) {
              const headers = context?.headers || context?.request?.headers;
              const extractHeader = (hName: string): string | null => {
                if (!headers) return null;
                if (typeof headers.get === 'function') return headers.get(hName);
                return headers[hName] || headers[hName.toLowerCase()] || null;
              };
              const rawIp =
                extractHeader('cf-connecting-ip') ||
                extractHeader('x-real-ip') ||
                extractHeader('x-client-ip') ||
                extractHeader('x-forwarded-for')?.split(',')[0]?.trim() ||
                context?.request?.ip ||
                context?.request?.socket?.remoteAddress ||
                null;
              if (rawIp) {
                updates.ipAddress = String(rawIp).replace(/^::ffff:/, '').trim();
              }
            }
            return Promise.resolve(Object.keys(updates).length > 0 ? { data: updates } : undefined);
          },
          after: async (session, context) => {
            if (deps.onSessionCreated) {
              await deps.onSessionCreated(session as never, context);
            }
          },
        },
        delete: {
          after: async (session, context) => {
            if (deps.onSessionDeleted) {
              await deps.onSessionDeleted(session as never, context);
            }
          },
        },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-real-ip', 'x-client-ip', 'x-forwarded-for'],
      },
      cookies: {
        session_token: {
          name: 'rac3011.session',
          attributes: {
            httpOnly: true,
            // 'test' runs e2e requests over plain HTTP, so Secure/scoped-domain cookies never replay.
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: env.NODE_ENV === 'test' ? undefined : env.COOKIE_DOMAIN,
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        sendVerificationOTP: ({ email, otp, type }) => deps.sendOtpEmail({ email, otp, type }),
      }),
      twoFactor({ issuer: 'Rotaract District Organisation' }),
    ],
  });
}
