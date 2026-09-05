import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { PermissionGuard } from './permission.guard';
import { PermissionsController } from './permissions.controller';
import { RbacRepository } from './rbac.repository';
import { RbacResolverService } from './rbac-resolver.service';
import { RbacRouteAudit } from './rbac-route-audit.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UserRolesController } from './user-roles.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [RolesController, PermissionsController, UserRolesController],
  providers: [
    RbacRepository,
    RbacResolverService,
    RolesService,
    RbacRouteAudit,
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [RbacResolverService, RbacRouteAudit, RolesService],
})
export class RbacModule {}
