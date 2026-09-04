import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/access.decorators';
import type { RequestContext } from '../common/types/access';
import { CreateUserRoleDto } from './dto/user-role.dto';
import { RolesService } from './roles.service';

@ApiTags('user-roles')
@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission('roles:manage')
  list(@Query('filter') filter?: Record<string, string>) {
    return this.roles.listUserRoles(filter?.userId);
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
