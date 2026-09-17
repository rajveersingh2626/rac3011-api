import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';

export interface ParticipantSessionPayload {
  participantId: string;
  email: string;
  fullName: string;
  homeDistrict: string;
  iat: number;
  exp: number;
}

const BCRYPT_COST = 12;
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

@Injectable()
export class RideAuthService {
  constructor(private readonly prisma: PrismaService) {}

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
      exp: now + TOKEN_TTL_SECONDS,
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

  async login(identifier: string, password: string) {
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

    const token = this.signToken({
      participantId: participant.id,
      email: participant.email,
      fullName: participant.fullName,
      homeDistrict: participant.homeDistrict,
    });

    return {
      participant: this.sanitizeParticipant(participant),
      token,
    };
  }

  async getParticipantFromToken(token: string) {
    const payload = this.verifyToken(token);
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
