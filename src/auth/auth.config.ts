import { betterAuth } from 'better-auth';
import type { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP, twoFactor } from 'better-auth/plugins';
import { env } from '../config/env';
import { hashPassword, verifyPassword } from './legacy-password';

export type SendOtpEmail = (input: { email: string; otp: string; type: string }) => Promise<void>;
export type SendResetPasswordEmail = (input: { email: string; name: string; url: string; token: string }) => Promise<void>;

export type AuthConfigDeps = {
  database: ReturnType<typeof prismaAdapter>;
  sendOtpEmail: SendOtpEmail;
  sendResetPasswordEmail?: SendResetPasswordEmail;
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
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      additionalFields: {
        mfaPending: { type: 'boolean', required: false, input: false, defaultValue: true },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // twoFactor issues a fresh session on a verified TOTP check; without this it'd inherit
          // mfaPending:true and stay stuck behind SecondFactorStage forever.
          before: (session, context) =>
            Promise.resolve(
              context?.path === '/two-factor/verify-totp'
                ? { data: { mfaPending: false } }
                : undefined,
            ),
        },
      },
    },
    advanced: {
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
      twoFactor({ issuer: 'Rotaract District 3011' }),
    ],
  });
}
