import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public, RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { RegisterMemberDto } from './dto/register-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';
import { memberDto } from './members.transformer';
import { MEMBER_STATUSES, type MemberStatus } from './members.types';

const FILTERS = ['status', 'clubId', 'q'] as const;

function parseStatusFilter(value: string | undefined): MemberStatus | undefined {
  if (value === undefined) return undefined;
  if (!(MEMBER_STATUSES as readonly string[]).includes(value)) {
    throw new BadRequestException(`Unknown status "${value}"`);
  }
  return value as MemberStatus;
}

@ApiTags('members')
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Post('register')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async register(@Body() dto: RegisterMemberDto) {
    const member = await this.members.register(dto);
    return { id: member.id, status: member.status };
  }

  @Get()
  @RequirePermission('members:view', 'members:approve')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.members.list(
      ctx.access,
      {
        status: parseStatusFilter(q.filter.status),
        clubId: q.filter.clubId,
        q: q.q,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(memberDto), total, q);
  }

  @Get(':id')
  @RequirePermission('members:view', 'members:approve')
  async get(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return memberDto(await this.members.get(ctx.access, id));
  }

  @Patch(':id')
  @RequirePermission('members:approve')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return memberDto(await this.members.updateStatus(ctx.access, id, dto));
  }
}
