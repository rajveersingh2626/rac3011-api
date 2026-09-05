import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { parseListQuery } from '../common/query/list-query';
import { RecheckAssetLinkDto } from './dto/recheck-asset-link.dto';
import { assetLinkAdminDto } from './link-health.transformer';
import { LinkHealthService } from './link-health.service';

const FILTERS = ['status'] as const;

@ApiTags('asset-links')
@Controller('asset-links')
export class LinkHealthController {
  constructor(private readonly linkHealth: LinkHealthService) {}

  @Get()
  @RequirePermission('content:edit')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const status = q.filter.status as 'unchecked' | 'ok' | 'broken' | 'private' | undefined;
    const items = await this.linkHealth.listAdmin(status);
    return { items: items.map(assetLinkAdminDto), total: items.length };
  }

  @Patch(':id')
  @RequirePermission('content:edit')
  async recheck(@Param('id') id: string, @Body() dto: RecheckAssetLinkDto) {
    if (!dto.recheck) throw new BadRequestException('recheck must be true');
    const row = await this.linkHealth.recheckAndReturn(id);
    if (!row) throw new NotFoundException();
    return assetLinkAdminDto(row);
  }
}
