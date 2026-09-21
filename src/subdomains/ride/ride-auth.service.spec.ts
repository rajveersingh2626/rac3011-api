import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { RideAuthService } from './ride-auth.service';

describe('RideAuthService', () => {
  let service: RideAuthService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      rideParticipant: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    service = new RideAuthService(mockPrisma);
  });

  it('hashes and verifies passwords correctly', async () => {
    const password = 'SecretDelegatePassword#2026';
    const hash = await service.hashPassword(password);
    expect(hash).toMatch(/^\$2[aby]\$/);

    const isValid = await service.verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await service.verifyPassword('WrongPassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('signs and verifies participant JWT session token', () => {
    const payload = {
      sid: 'sess-test-1',
      participantId: 'part-12345',
      email: 'delegate@rotaract3141.org',
      fullName: 'Rtr. Delegate Name',
      homeDistrict: '3141',
    };

    const token = service.signToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = service.verifyToken(token);
    expect(verified.sid).toBe(payload.sid);
    expect(verified.participantId).toBe(payload.participantId);
    expect(verified.email).toBe(payload.email);
    expect(verified.homeDistrict).toBe(payload.homeDistrict);
  });

  it('rejects tampered participant tokens', () => {
    const payload = {
      sid: 'sess-test-2',
      participantId: 'part-12345',
      email: 'delegate@rotaract3141.org',
      fullName: 'Rtr. Delegate Name',
      homeDistrict: '3141',
    };

    const token = service.signToken(payload);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalidsignature`;

    expect(() => service.verifyToken(tampered)).toThrow(UnauthorizedException);
  });

  it('strictly isolates participant login to ride_participants table only', async () => {
    const password = 'DelegatePassword@2026';
    const hash = await service.hashPassword(password);

    // Mock participant found
    mockPrisma.rideParticipant.findFirst.mockResolvedValueOnce({
      id: 'part-001',
      email: 'external.delegate@rotaract.org',
      fullName: 'External Delegate',
      homeDistrict: '3141',
      isActive: true,
      passwordHash: hash,
    });

    const result = await service.login('external.delegate@rotaract.org', password);
    expect(result.participant.id).toBe('part-001');
    expect(result.participant.passwordHash).toBeUndefined();
    expect(result.token).toBeDefined();

    // Verify findFirst was called strictly on rideParticipant
    expect(mockPrisma.rideParticipant.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: { equals: 'external.delegate@rotaract.org', mode: 'insensitive' } },
          { rotaryId: { equals: 'external.delegate@rotaract.org' } },
        ],
      },
    });
  });

  it('hard blocks users who do not exist in ride_participants (e.g. Super Admins / District Members)', async () => {
    // When a district member tries to log in, rideParticipant.findFirst returns null
    mockPrisma.rideParticipant.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.login('admin@rotaract3011.org', 'Admin@12345'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('blocks inactive participants from logging in', async () => {
    const password = 'DelegatePassword@2026';
    const hash = await service.hashPassword(password);

    mockPrisma.rideParticipant.findFirst.mockResolvedValueOnce({
      id: 'part-suspended',
      email: 'suspended@rotaract.org',
      fullName: 'Suspended Delegate',
      homeDistrict: '3141',
      isActive: false,
      passwordHash: hash,
    });

    await expect(
      service.login('suspended@rotaract.org', password),
    ).rejects.toThrow('Participant account is inactive');
  });
});
