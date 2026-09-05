import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ShowcaseAdminService } from './showcase-admin.service';
import { projectDto } from './showcase-admin.transformer';
import type { ProjectStatus } from './showcase.types';

const FILTERS = ['status', 'clubId', 'category'] as const;

@ApiTags('showcase')
@Controller('projects')
export class ShowcaseAdminController {
  constructor(private readonly service: ShowcaseAdminService) {}

  @Get()
  @RequirePermission('showcase:submit', 'showcase:publish')
  async list(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.service.list(
      ctx,
      {
        status: q.filter.status as ProjectStatus | undefined,
        clubId: q.filter.clubId,
        category: q.filter.category,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(projectDto), total, q);
  }

  @Post()
  @RequirePermission('showcase:submit')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateProjectDto) {
    return projectDto(await this.service.create(ctx, dto));
  }

  @Get(':id')
  @RequirePermission('showcase:submit', 'showcase:publish')
  async get(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    return projectDto(await this.service.get(ctx, id));
  }

  @Patch(':id')
  @RequirePermission('showcase:submit', 'showcase:publish')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return projectDto(await this.service.update(ctx, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('showcase:submit')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.service.remove(ctx, id);
  }
}
