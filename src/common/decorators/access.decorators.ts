import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../types/permission-keys';

export const REQUIRE_PERMISSION_KEY = 'rac3011:requirePermission';
export const PUBLIC_KEY = 'rac3011:public';
export const AUTHENTICATED_KEY = 'rac3011:authenticated';
export const SECOND_FACTOR_STAGE_KEY = 'rac3011:secondFactorStage';

export const RequirePermission = (key: PermissionKey) => SetMetadata(REQUIRE_PERMISSION_KEY, key);
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);
export const SecondFactorStage = () => SetMetadata(SECOND_FACTOR_STAGE_KEY, true);
