import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { CommitImportDto, PreviewImportDto } from './dto/import-members.dto';
import { MembersImportsService } from './members-imports.service';

@ApiTags('members')
@Controller('members/imports')
export class MembersImportsController {
  constructor(private readonly imports: MembersImportsService) {}

  @Post()
  @RequirePermission('members:import')
  async preview(@CurrentUser() ctx: RequestContext, @Body() dto: PreviewImportDto) {
    return this.imports.preview(ctx.access, dto.clubId, dto.csv);
  }

  @Patch(':id')
  @RequirePermission('members:import')
  async commit(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: CommitImportDto,
  ) {
    return this.imports.commit(ctx.access, id, dto.clubId, dto.rows);
  }
}
