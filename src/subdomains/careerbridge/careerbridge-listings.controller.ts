import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../../common/query/list-query';
import type { RequestContext } from '../../common/types/access';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CareerbridgeListingsService } from './careerbridge-listings.service';
import { listingDto } from './careerbridge.transformer';
import type { ListingStatusKind, ListingTypeKind } from './careerbridge.types';

const FILTERS = ['status', 'type'] as const;
const MANAGE_PERMISSION = 'subdomain:careerbridge:manage';

@ApiTags('careerbridge')
@Controller('careerbridge/listings')
export class CareerbridgeListingsController {
  constructor(private readonly service: CareerbridgeListingsService) {}

  @Get()
  @RequirePermission(MANAGE_PERMISSION)
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      ctx,
      {
        status: q.filter.status as ListingStatusKind | undefined,
        type: q.filter.type as ListingTypeKind | undefined,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(listingDto), total, q);
  }

  @Get('stats')
  @RequirePermission(MANAGE_PERMISSION)
  async stats(@CurrentUser() ctx: RequestContext) {
    return this.service.stats(ctx);
  }

  @Get(':id')
  @RequirePermission(MANAGE_PERMISSION)
  async get(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return listingDto(await this.service.get(ctx, id));
  }

  @Patch(':id')
  @RequirePermission(MANAGE_PERMISSION)
  async review(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return listingDto(await this.service.review(ctx, id, dto));
  }
}
