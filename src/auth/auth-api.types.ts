export type AuthSessionUser = {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
};

export type AuthSession = {
  session: { id: string; userId: string; mfaPending: boolean };
  user: AuthSessionUser;
};

// Narrow view of `auth.api`: Better Auth's generic `Auth` type does not surface plugin
// methods without instance-specific generics, so callers cast through this interface.
export interface AuthApi {
  getSession(input: { headers: Headers }): Promise<AuthSession | null>;
  sendVerificationOTP(input: {
    body: { email: string; type: 'sign-in' };
  }): Promise<{ success: boolean }>;
  checkVerificationOTP(input: {
    body: { email: string; type: 'sign-in'; otp: string };
  }): Promise<{ success: boolean }>;
  verifyTOTP(input: {
    body: { code: string };
    headers: Headers;
  }): Promise<{ status?: boolean } | undefined>;
}
