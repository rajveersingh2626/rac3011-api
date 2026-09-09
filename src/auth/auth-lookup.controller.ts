import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/access.decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('auth-lookup')
@Controller('auth-lookup')
export class AuthLookupController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('resolve')
  @Public()
  async resolve(@Query('identifier') rawIdentifier?: string): Promise<{ email: string }> {
    if (!rawIdentifier || !rawIdentifier.trim()) {
      throw new BadRequestException('Identifier is required');
    }
    const identifier = rawIdentifier.trim();
    if (identifier.includes('@')) {
      return { email: identifier.toLowerCase() };
    }

    // Lookup by rotaryId or phone in member_profiles
    const profile = await this.prisma.memberProfile.findFirst({
      where: {
        OR: [
          { rotaryId: { equals: identifier, mode: 'insensitive' } },
          { phone: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      select: { email: true },
    });

    if (profile?.email) {
      return { email: profile.email.toLowerCase() };
    }

    return { email: identifier };
  }
}
