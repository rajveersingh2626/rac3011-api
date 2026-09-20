import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { CacheTags } from '../../cache/cache-tags.decorator';
import { Public } from '../../common/decorators/access.decorators';
import { extractClientIp, readCookie } from '../../auth/cookie.util';
import { RideDashboardService } from './ride-dashboard.service';
import { RideDelegationsService } from './ride-delegations.service';
import { RideGalleryService } from './ride-gallery.service';
import { RideParticipantsService } from './ride-participants.service';
import { RegisterParticipantDto } from './dto/register-participant.dto';
import { delegationPublicDto, galleryItemDto } from './ride.transformer';
import { PARTICIPANT_COOKIE_NAME } from './guards/participant-auth.guard';
import { RideResourcesService } from './ride-resources.service';
import { RideAuthService } from './ride-auth.service';

@ApiTags('public')
@Controller('public/ride')
export class RidePublicController {
  constructor(
    private readonly delegations: RideDelegationsService,
    private readonly gallery: RideGalleryService,
    private readonly dashboard: RideDashboardService,
    private readonly participants: RideParticipantsService,
    private readonly resources: RideResourcesService,
    private readonly auth: RideAuthService,
  ) {}

  @Post('participants')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ ride_auth: { limit: 10, ttl: 60000 } })
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
    @Req() req: Request,
    @Query('email') email?: string,
    @Query('clubName') clubName?: string,
    @Query('district') district?: string,
  ) {
    let participant: any = null;
    let token = readCookie(req.headers.cookie, PARTICIPANT_COOKIE_NAME);
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7).trim();
    }
    if (token) {
      try {
        const clientIp = extractClientIp(req);
        participant = await this.auth.getParticipantFromToken(token, clientIp);
      } catch {}
    }

    const targetEmail = participant?.email || email;
    const targetClub = participant?.homeClubName || clubName;
    const targetDistrict = participant?.homeDistrict || district;

    const items = await this.resources.listForParticipant(
      targetEmail,
      targetClub,
      targetDistrict,
    );
    return { items };
  }

  @Get('announcements')
  @Public()
  async getAnnouncements(
    @Req() req: Request,
    @Query('email') email?: string,
    @Query('district') district?: string,
  ) {
    let participant: any = null;
    let token = readCookie(req.headers.cookie, PARTICIPANT_COOKIE_NAME);
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7).trim();
    }
    if (token) {
      try {
        const clientIp = extractClientIp(req);
        participant = await this.auth.getParticipantFromToken(token, clientIp);
      } catch {}
    }

    const targetEmail = participant?.email || email;
    const targetDistrict = participant?.homeDistrict || district;

    const items = await this.participants.listAnnouncementsForParticipant(
      targetDistrict,
      targetEmail,
    );
    return { items };
  }

  @Get('dashboard')
  @Public()
  @CacheTags('ride')
  async getDashboard() {
    return this.dashboard.build();
  }
}
