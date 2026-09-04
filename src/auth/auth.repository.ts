import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type TrustedDeviceRow = {
  id: string;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async setSessionMfaPending(sessionId: string, mfaPending: boolean): Promise<void> {
    await this.prisma.session.update({ where: { id: sessionId }, data: { mfaPending } });
  }

  async hasValidTrustedDevice(userId: string, tokenHash: string): Promise<boolean> {
    const count = await this.prisma.trustedDevice.count({
      where: { userId, tokenHash, expiresAt: { gt: new Date() } },
    });
    return count > 0;
  }

  async createTrustedDevice(input: {
    userId: string;
    tokenHash: string;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.trustedDevice.create({ data: input });
  }

  async listTrustedDevices(userId: string): Promise<TrustedDeviceRow[]> {
    return this.prisma.trustedDevice.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteTrustedDevice(id: string, userId: string): Promise<number> {
    const result = await this.prisma.trustedDevice.deleteMany({ where: { id, userId } });
    return result.count;
  }
}
