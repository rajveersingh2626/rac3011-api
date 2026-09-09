import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/access.decorators';
import { parseListQuery } from '../common/query/list-query';
import type { RequestContext } from '../common/types/access';
import { CreateUserRoleDto } from './dto/user-role.dto';
import { RolesService } from './roles.service';

const FILTERS = ['userId'] as const;

@ApiTags('user-roles')
@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('directory')
  @RequirePermission('roles:manage')
  directory(@Query('q') q?: string) {
    return this.roles.listUsersDirectory(q);
  }

  @Get()
  @RequirePermission('roles:manage')
  list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    return this.roles.listUserRoles(q.filter.userId);
  }

  @Post()
  @RequirePermission('roles:manage')
  grant(@CurrentUser() ctx: RequestContext, @Body() dto: CreateUserRoleDto) {
    return this.roles.grantUserRole(ctx.user.id, dto);
  }

  @Delete(':id')
  @RequirePermission('roles:manage')
  async revoke(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.roles.revokeUserRole(ctx.user.id, id);
  }
}
