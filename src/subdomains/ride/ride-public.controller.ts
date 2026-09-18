import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheTags } from '../../cache/cache-tags.decorator';
import { Public } from '../../common/decorators/access.decorators';
import { RideDashboardService } from './ride-dashboard.service';
import { RideDelegationsService } from './ride-delegations.service';
import { RideGalleryService } from './ride-gallery.service';
import { RideParticipantsService } from './ride-participants.service';
import { RegisterParticipantDto } from './dto/register-participant.dto';
import { delegationPublicDto, galleryItemDto } from './ride.transformer';

import { RideResourcesService } from './ride-resources.service';

@ApiTags('public')
@Controller('public/ride')
export class RidePublicController {
  constructor(
    private readonly delegations: RideDelegationsService,
    private readonly gallery: RideGalleryService,
    private readonly dashboard: RideDashboardService,
    private readonly participants: RideParticipantsService,
    private readonly resources: RideResourcesService,
  ) {}

  @Post('participants')
  @Public()
  async registerParticipant(@Body() dto: RegisterParticipantDto) {
    const created = await this.participants.register(dto);
    return {
      id: created.id,
      fullName: created.fullName,
      status: created.status,
      message: 'Registration received for Delhi Meri Jaan 2026',
    };
  }

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

  @Get('resources')
  @Public()
  async getResources(
    @Query('email') email?: string,
    @Query('clubName') clubName?: string,
    @Query('district') district?: string,
  ) {
    const items = await this.resources.listForParticipant(email, clubName, district);
    return { items };
  }

  @Get('announcements')
  @Public()
  async getAnnouncements(
    @Query('district') district?: string,
    @Query('email') email?: string,
  ) {
    const items = await this.participants.listAnnouncementsForParticipant(district, email);
    return { items };
  }

  @Get('dashboard')
  @Public()
  @CacheTags('ride')
  async getDashboard() {
    return this.dashboard.build();
  }
}
