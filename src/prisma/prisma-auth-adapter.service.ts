import { Injectable } from '@nestjs/common';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaAuthAdapterService {
  constructor(private readonly prisma: PrismaService) {}

  create(): ReturnType<typeof prismaAdapter> {
    return prismaAdapter(this.prisma, { provider: 'postgresql' });
  }
}
