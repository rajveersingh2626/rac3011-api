import { Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type IORedis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';
import { CACHE_REDIS } from '../../cache/redis.provider';

export interface ParticipantSessionPayload {
  sid: string;
  participantId: string;
  email: string;
  fullName: string;
  homeDistrict: string;
  iat: number;
  exp: number;
}

export interface ParticipantSessionRecord {
  sessionId: string;
  participantId: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

const BCRYPT_COST = 12;
// 2 hours rolling inactivity timeout matching main district portal
export const PARTICIPANT_SESSION_TTL_SECONDS = 2 * 60 * 60;
export const PARTICIPANT_SESSION_PREFIX = 'ride:session:';

@Injectable()
export class RideAuthService {
  private readonly memorySessions = new Map<string, ParticipantSessionRecord>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(CACHE_REDIS) private readonly redis?: IORedis,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!hash || !hash.startsWith('$2')) return false;
    return bcrypt.compare(password, hash);
  }

  signToken(payload: Omit<ParticipantSessionPayload, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: ParticipantSessionPayload = {
      ...payload,
      iat: now,
      exp: now + PARTICIPANT_SESSION_TTL_SECONDS,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = createHmac('sha256', env.AUTH_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  verifyToken(token: string): ParticipantSessionPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing participant session token');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed participant session token');
    }

    const [header, body, signature] = parts;
    const expectedSignature = createHmac('sha256', env.AUTH_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);

    if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
      throw new UnauthorizedException('Invalid participant session token signature');
    }

    let payload: ParticipantSessionPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Corrupted participant session token payload');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('Participant session has expired');
    }

    return payload;
  }

  async createSession(
    participantId: string,
    email: string,
    ipAddress: string | null = null,
    userAgent: string | null = null,
  ): Promise<ParticipantSessionRecord> {
    const sessionId = randomUUID();
    const now = Date.now();
    const record: ParticipantSessionRecord = {
      sessionId,
      participantId,
      email,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActiveAt: now,
      expiresAt: now + PARTICIPANT_SESSION_TTL_SECONDS * 1000,
    };

    const key = `${PARTICIPANT_SESSION_PREFIX}${sessionId}`;
    this.memorySessions.set(sessionId, record);

    if (this.redis) {
      try {
        await this.redis.set(
          key,
          JSON.stringify(record),
          'EX',
          PARTICIPANT_SESSION_TTL_SECONDS,
        );
      } catch {
        // Ignore Redis error, memorySessions acts as durable fallback
      }
    }

    return record;
  }

  async validateAndTouchSession(
    sessionId: string,
    clientIp?: string | null,
  ): Promise<ParticipantSessionRecord> {
    const key = `${PARTICIPANT_SESSION_PREFIX}${sessionId}`;
    let record: ParticipantSessionRecord | undefined;

    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) {
          record = JSON.parse(raw);
        }
      } catch {
        record = this.memorySessions.get(sessionId);
      }
    } else {
      record = this.memorySessions.get(sessionId);
    }

    if (!record) {
      throw new UnauthorizedException(
        'Session has timed out due to inactivity or has been invalidated. Please log in again.',
      );
    }

    const now = Date.now();
    const elapsed = now - record.lastActiveAt;
    if (elapsed > PARTICIPANT_SESSION_TTL_SECONDS * 1000) {
      await this.invalidateSession(sessionId);
      throw new UnauthorizedException(
        'Session has timed out due to inactivity. Please log in again.',
      );
    }

    // Sliding rolling window: Touch session activity if at least 30s elapsed or IP updated
    if (elapsed > 30 * 1000 || (clientIp && clientIp !== record.ipAddress)) {
      record.lastActiveAt = now;
      record.expiresAt = now + PARTICIPANT_SESSION_TTL_SECONDS * 1000;
      if (clientIp) record.ipAddress = clientIp;

      this.memorySessions.set(sessionId, record);
      if (this.redis) {
        try {
          await this.redis.set(
            key,
            JSON.stringify(record),
            'EX',
            PARTICIPANT_SESSION_TTL_SECONDS,
          );
        } catch {
          // Ignore Redis write errors
        }
      }
    }

    return record;
  }

  async invalidateSession(tokenOrSid: string): Promise<void> {
    let sid = tokenOrSid;
    if (tokenOrSid.includes('.')) {
      try {
        const payload = this.verifyToken(tokenOrSid);
        sid = payload.sid;
      } catch {
        return;
      }
    }

    if (!sid) return;
    this.memorySessions.delete(sid);
    if (this.redis) {
      try {
        await this.redis.del(`${PARTICIPANT_SESSION_PREFIX}${sid}`);
      } catch {
        // Ignore
      }
    }
  }

  async listActiveSessions(): Promise<ParticipantSessionRecord[]> {
    const map = new Map<string, ParticipantSessionRecord>();
    const now = Date.now();

    for (const [sid, rec] of this.memorySessions.entries()) {
      if (rec.expiresAt > now) {
        map.set(sid, rec);
      } else {
        this.memorySessions.delete(sid);
      }
    }

    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${PARTICIPANT_SESSION_PREFIX}*`);
        if (keys.length > 0) {
          const values = await this.redis.mget(keys);
          for (const raw of values) {
            if (raw) {
              const rec: ParticipantSessionRecord = JSON.parse(raw);
              if (rec.expiresAt > now) {
                map.set(rec.sessionId, rec);
              }
            }
          }
        }
      } catch {
        // Fallback to memorySessions
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }

  async revokeUserSessions(participantId: string): Promise<number> {
    const sessions = await this.listActiveSessions();
    const userSessions = sessions.filter((s) => s.participantId === participantId);
    for (const s of userSessions) {
      await this.invalidateSession(s.sessionId);
    }
    return userSessions.length;
  }

  async revokeAllSessions(): Promise<number> {
    const sessions = await this.listActiveSessions();
    for (const s of sessions) {
      await this.invalidateSession(s.sessionId);
    }
    return sessions.length;
  }

  async login(
    identifier: string,
    password: string,
    ipAddress: string | null = null,
    userAgent: string | null = null,
  ) {
    const cleanId = identifier.trim().toLowerCase();

    // STRICT ISOLATION: Strictly and exclusively query ride_participants
    const participant = await this.prisma.rideParticipant.findFirst({
      where: {
        OR: [
          { email: { equals: cleanId, mode: 'insensitive' } },
          { rotaryId: { equals: identifier.trim() } },
        ],
      },
    });

    if (!participant) {
      throw new UnauthorizedException(
        'Participant account not found. Only registered RIDE delegates and participants can access this portal.',
      );
    }

    if (!participant.isActive) {
      throw new UnauthorizedException('Participant account is inactive. Please contact RIDE administration.');
    }

    if (!participant.passwordHash) {
      throw new UnauthorizedException(
        'Password has not been set for this participant account. Please ask RIDE administration to assign credentials.',
      );
    }

    const isValid = await this.verifyPassword(password, participant.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials for this participant account.');
    }

    // Create tracked session with IP, userAgent, and rolling 2-hour inactivity timeout
    const session = await this.createSession(
      participant.id,
      participant.email,
      ipAddress,
      userAgent,
    );

    const token = this.signToken({
      sid: session.sessionId,
      participantId: participant.id,
      email: participant.email,
      fullName: participant.fullName,
      homeDistrict: participant.homeDistrict,
    });

    return {
      participant: this.sanitizeParticipant(participant),
      token,
      session: {
        sessionId: session.sessionId,
        ipAddress: session.ipAddress,
        expiresAt: new Date(session.expiresAt).toISOString(),
      },
    };
  }

  async getParticipantFromToken(token: string, clientIp?: string | null) {
    const payload = this.verifyToken(token);

    // Validate active session and enforce rolling timeout
    if (payload.sid) {
      await this.validateAndTouchSession(payload.sid, clientIp);
    }

    const participant = await this.prisma.rideParticipant.findUnique({
      where: { id: payload.participantId },
      include: {
        hostClub: {
          select: { id: true, name: true, zone: true },
        },
      },
    });

    if (!participant || !participant.isActive) {
      throw new UnauthorizedException('Participant account no longer exists or is inactive.');
    }

    return this.sanitizeParticipant(participant);
  }

  sanitizeParticipant(participant: any) {
    const { passwordHash, ...safe } = participant;
    return safe;
  }
}
