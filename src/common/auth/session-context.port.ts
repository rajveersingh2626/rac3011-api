import type { Request } from 'express';
import type { SessionUser } from '../types/access';

export type ResolvedSession = {
  user: SessionUser;
  sessionId: string;
  mfaPending: boolean;
  expiresAt?: string | null;
};

export abstract class SessionContextPort {
  abstract fromRequest(req: Request): Promise<ResolvedSession | null>;
}
