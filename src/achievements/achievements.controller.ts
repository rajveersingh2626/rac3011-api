import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReorderDto } from '../common/dto/reorder.dto';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { AchievementsService } from './achievements.service';
import { achievementAdminDto } from './achievements.transformer';
import { CreateAchievementDto, UpdateAchievementDto } from './dto/achievement.dto';

@ApiTags('achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  @RequirePermission('public_content:manage')
  async list() {
    return { items: (await this.achievements.list()).map(achievementAdminDto) };
  }

  @Post()
  @RequirePermission('public_content:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateAchievementDto) {
    return achievementAdminDto(await this.achievements.create(ctx.user.id, dto));
  }

  @Patch(':id')
  @RequirePermission('public_content:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateAchievementDto,
  ) {
    return achievementAdminDto(await this.achievements.update(ctx.user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('public_content:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.achievements.remove(ctx.user.id, id);
  }

  @Post('reorder')
  @RequirePermission('public_content:manage')
  async reorder(@CurrentUser() ctx: RequestContext, @Body() dto: ReorderDto) {
    return {
      items: (await this.achievements.reorder(ctx.user.id, dto.ids)).map(achievementAdminDto),
    };
  }
}
