import { Global, Module } from '@nestjs/common';
import { PrismaAuthAdapterService } from './prisma-auth-adapter.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, PrismaAuthAdapterService],
  exports: [PrismaService, PrismaAuthAdapterService],
})
export class PrismaModule {}
