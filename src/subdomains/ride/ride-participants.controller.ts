import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, Public, RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestContext } from '../../common/types/access';
import { paginate, parseListQuery } from '../../common/query/list-query';
import { RideParticipantsService } from './ride-participants.service';
import { UpdateParticipantStatusDto } from './dto/register-participant.dto';
import { DispatchRideBroadcastDto } from './dto/dispatch-ride-broadcast.dto';
import { ParticipantAuthGuard } from './guards/participant-auth.guard';
import { CurrentParticipant } from './decorators/current-participant.decorator';

const FILTERS = ['status', 'homeDistrict'] as const;

@ApiTags('ride')
@Controller('ride/participants')
export class RideParticipantsController {
  constructor(private readonly service: RideParticipantsService) {}

  @Post('broadcast')
  @RequirePermission('comms:send', 'subdomain:ride:manage', 'ride:manage')
  async dispatchBroadcast(@Body() dto: DispatchRideBroadcastDto) {
    return this.service.dispatchBroadcast(dto);
  }

  @Get('districts')
  @Public()
  async getDistricts() {
    const districts = await this.service.getDistricts();
    return { districts };
  }

  @Post('admin/reset')
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async resetRegistrations(
    @CurrentUser() ctx: RequestContext,
    @Body() body?: any,
  ) {
    let parsed = body;
    if (typeof body === 'string') {
      try {
        parsed = JSON.parse(body);
      } catch {
        // keep as is
      }
    }
    return this.service.resetRegistrations(ctx?.user?.id ?? null, parsed?.confirmation, parsed?.mode);
  }

  @Get('me')
  @Public()
  @UseGuards(ParticipantAuthGuard)
  async me(@CurrentParticipant() participant: any) {
    return participant;
  }

  @Post('admin/create')
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async adminCreate(
    @Body()
    body: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      homeDistrict?: string;
      homeClubName?: string;
      rotaryId?: string;
      participantType?: string;
    },
  ) {
    if (!body.email || !body.password || !body.fullName) {
      throw new Error('Full Name, Email and Password are required');
    }
    return this.service.adminCreateParticipant(body);
  }

  @Post('admin/:id/reset-password')
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async adminResetPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    if (!body.password) {
      throw new Error('Password is required');
    }
    return this.service.adminResetPassword(id, body.password);
  }

  @Post('admin/:id/toggle-active')
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async adminToggleActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.service.adminToggleActive(id, body.isActive);
  }

  @Get()
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      {
        status: q.filter.status,
        homeDistrict: q.filter.homeDistrict,
        search: q.q,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items, total, q);
  }

  @Get('stats')
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async stats() {
    return this.service.getStats();
  }

  @Get(':id')
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id/status')
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateParticipantStatusDto,
  ) {
    return this.service.updateStatus(
      id,
      dto.status,
      dto.hostClubId,
      dto.hostFamilyName,
      dto.hostFamilyPhone,
    );
  }

  @Delete(':id')
  @RequirePermission('subdomain:ride:manage', 'ride:manage', 'ride:delegates:manage')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true };
  }
}
