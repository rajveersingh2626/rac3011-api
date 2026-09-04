import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { EmailProviderName } from './email/email-provider';

type CountRow = { count: number };

@Injectable()
export class EmailUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async increment(provider: EmailProviderName, day: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      INSERT INTO email_provider_usage (provider, day, count, created_at, updated_at)
      VALUES (${provider}, ${day}::date, 1, now(), now())
      ON CONFLICT (provider, day)
      DO UPDATE SET count = email_provider_usage.count + 1, updated_at = now()
      RETURNING count
    `);
    return rows[0]?.count ?? 0;
  }

  async decrement(provider: EmailProviderName, day: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      UPDATE email_provider_usage
      SET count = GREATEST(count - 1, 0), updated_at = now()
      WHERE provider = ${provider} AND day = ${day}::date
      RETURNING count
    `);
    return rows[0]?.count ?? 0;
  }

  async usageFor(day: Date): Promise<Map<EmailProviderName, number>> {
    const rows = await this.prisma.emailProviderUsage.findMany({
      where: { day },
      select: { provider: true, count: true },
    });
    return new Map(rows.map((r) => [r.provider as EmailProviderName, r.count]));
  }
}
