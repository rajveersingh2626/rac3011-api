import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheTags } from '../../cache/cache-tags.decorator';
import { Public } from '../../common/decorators/access.decorators';
import { RideDashboardService } from './ride-dashboard.service';
import { RideDelegationsService } from './ride-delegations.service';
import { RideGalleryService } from './ride-gallery.service';
import { delegationPublicDto, galleryItemDto } from './ride.transformer';

@ApiTags('public')
@Controller('public/ride')
export class RidePublicController {
  constructor(
    private readonly delegations: RideDelegationsService,
    private readonly gallery: RideGalleryService,
    private readonly dashboard: RideDashboardService,
  ) {}

  // Cancelled delegations are omitted from the public list; the admin panel is the source of
  // truth for those, and there's no reason to advertise a visit that fell through.
  @Get('incoming')
  @Public()
  @CacheTags('ride')
  async incoming() {
    const items = await this.delegations.listIncoming();
    return { items: items.map(delegationPublicDto) };
  }

  @Get('gallery')
  @Public()
  @CacheTags('ride')
  async galleryItems(@Query('year') year?: string) {
    const parsedYear = year ? Number(year) : undefined;
    const { items, years } = await this.gallery.publicList({ year: parsedYear });
    return { items: items.map(galleryItemDto), years };
  }

  @Get('dashboard')
  @Public()
  @CacheTags('ride')
  async getDashboard() {
    return this.dashboard.build();
  }
}
