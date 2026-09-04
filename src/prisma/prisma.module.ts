import { Global, Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { PrismaAuthAdapterService } from './prisma-auth-adapter.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [CacheModule],
  providers: [PrismaService, PrismaAuthAdapterService],
  exports: [PrismaService, PrismaAuthAdapterService],
})
export class PrismaModule {}
