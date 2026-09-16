import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestContext } from '../../common/types/access';
import { paginate, parseListQuery } from '../../common/query/list-query';
import { RideParticipantsService } from './ride-participants.service';
import { UpdateParticipantStatusDto } from './dto/register-participant.dto';

const FILTERS = ['status', 'homeDistrict'] as const;

@ApiTags('ride')
@Controller('ride/participants')
export class RideParticipantsController {
  constructor(private readonly service: RideParticipantsService) {}

  @Get('me')
  async me(@CurrentUser() ctx: RequestContext) {
    if (!ctx?.user) return null;
    return this.service.getByUser(ctx.user.id, ctx.user.email);
  }

  @Get()
  @RequirePermission('subdomain:ride:manage')
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
  @RequirePermission('subdomain:ride:manage')
  async stats() {
    return this.service.getStats();
  }

  @Get(':id')
  @RequirePermission('subdomain:ride:manage')
  async get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id/status')
  @RequirePermission('subdomain:ride:manage')
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
}
