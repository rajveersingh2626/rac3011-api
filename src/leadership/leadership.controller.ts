import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReorderDto } from '../common/dto/reorder.dto';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { LeadershipService } from './leadership.service';
import { districtTeamMemberAdminDto } from './leadership.transformer';
import {
  CreateDistrictTeamMemberDto,
  UpdateDistrictTeamMemberDto,
} from './dto/district-team-member.dto';

@ApiTags('district-team')
@Controller('district-team')
export class DistrictTeamController {
  constructor(private readonly leadership: LeadershipService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list() {
    return { items: (await this.leadership.listAdmin()).map(districtTeamMemberAdminDto) };
  }

  @Post()
  @RequirePermission('public_content:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateDistrictTeamMemberDto) {
    return districtTeamMemberAdminDto(await this.leadership.create(ctx.user.id, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateDistrictTeamMemberDto,
  ) {
    return districtTeamMemberAdminDto(await this.leadership.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.leadership.remove(ctx.user.id, id);
  }

  @Post('reorder')
  @RequirePermission('public_content:manage')
  async reorder(@CurrentUser() ctx: RequestContext, @Body() dto: ReorderDto) {
    return {
      items: (await this.leadership.reorder(ctx.user.id, dto.ids)).map(districtTeamMemberAdminDto),
    };
  }
}
