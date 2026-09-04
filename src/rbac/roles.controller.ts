import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/access.decorators';
import type { RequestContext } from '../common/types/access';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission('roles:manage')
  list() {
    return this.roles.listRoles();
  }

  @Post()
  @RequirePermission('roles:manage')
  create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateRoleDto) {
    return this.roles.createRole(ctx.user.id, dto);
  }

  @Get(':id')
  @RequirePermission('roles:manage')
  get(@Param('id') id: string) {
    return this.roles.getRole(id);
  }

  @Patch(':id')
  @RequirePermission('roles:manage')
  update(@CurrentUser() ctx: RequestContext, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.updateRole(ctx.user.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('roles:manage')
  async remove(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.roles.deleteRole(ctx.user.id, id);
  }
}
