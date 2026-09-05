import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { paginate, parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { DirectoryService } from './directory.service';
import { directoryEntryDto } from './members.transformer';

const FILTERS = ['q', 'skill', 'interest', 'clubId', 'zoneId'] as const;

@ApiTags('directory')
@Controller('directory')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get()
  @RequirePermission('directory:view')
  async search(@CurrentUser() ctx: RequestContext, @Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.directory.search(
      ctx.access,
      {
        q: q.q,
        skill: q.filter.skill,
        interest: q.filter.interest,
        clubId: q.filter.clubId,
        zoneId: q.filter.zoneId,
      },
      q.page,
      q.pageSize,
    );
    return paginate(items.map(directoryEntryDto), total, q);
  }
}
