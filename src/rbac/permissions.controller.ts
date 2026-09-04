import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { RolesService } from './roles.service';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission('roles:manage')
  list() {
    return this.roles.listPermissions();
  }
}
