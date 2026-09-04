import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../types/permission-keys';

export const REQUIRE_PERMISSION_KEY = 'rac3011:requirePermission';
export const PUBLIC_KEY = 'rac3011:public';
export const AUTHENTICATED_KEY = 'rac3011:authenticated';
export const SECOND_FACTOR_STAGE_KEY = 'rac3011:secondFactorStage';

// Rest params: @RequirePermission('a') stores ['a']; @RequirePermission('a', 'b') means "a OR b" (PermissionGuard).
export const RequirePermission = (...keys: PermissionKey[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, keys);
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);
export const SecondFactorStage = () => SetMetadata(SECOND_FACTOR_STAGE_KEY, true);
