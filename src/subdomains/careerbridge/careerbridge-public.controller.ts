import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { CacheTags } from '../../cache/cache-tags.decorator';
import { Public } from '../../common/decorators/access.decorators';
import { paginate, parseListQuery } from '../../common/query/list-query';
import { CreateListingDto } from './dto/create-listing.dto';
import { VerifyListingDto } from './dto/verify-listing.dto';
import { CareerbridgeListingsService } from './careerbridge-listings.service';
import { publicListingDto } from './careerbridge.transformer';
import type { ListingTypeKind } from './careerbridge.types';

const FILTERS = ['type'] as const;

@ApiTags('public')
@Controller('public/careerbridge')
export class CareerbridgePublicController {
  constructor(private readonly service: CareerbridgeListingsService) {}

  @Get('listings')
  @Public()
  @CacheTags('careerbridge')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.listPublic(
      { type: q.filter.type as ListingTypeKind | undefined },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(publicListingDto), total, q);
  }

  @Get('listings/:id')
  @Public()
  @CacheTags('careerbridge')
  async get(@Param('id') id: string) {
    return publicListingDto(await this.service.getPublic(id));
  }

  @Post('listings')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async submit(@Body() dto: CreateListingDto) {
    return this.service.submit(dto);
  }

  @Post('listings/verify')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  async verify(@Body() dto: VerifyListingDto) {
    return this.service.verify(dto.token);
  }
}
