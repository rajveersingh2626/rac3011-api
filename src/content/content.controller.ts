import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { ContentService } from './content.service';
import { PatchContentBlockDto } from './dto/patch-content-block.dto';

const FILTERS = ['pageKey'] as const;

@ApiTags('content-blocks')
@Controller('content-blocks')
export class ContentBlocksController {
  constructor(private readonly content: ContentService) {}

  @Get()
  @RequirePermission('content:edit')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const items = await this.content.listBlocks(q.filter.pageKey);
    return { items };
  }

  @Patch(':pageKey/:sectionKey')
  @RequirePermission('content:edit')
  patch(
    @CurrentUser() ctx: RequestContext,
    @Param('pageKey') pageKey: string,
    @Param('sectionKey') sectionKey: string,
    @Body() dto: PatchContentBlockDto,
  ) {
    return this.content.editBlock(ctx, pageKey, sectionKey, dto);
  }
}
