import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MODULE_PATH, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer, Reflector } from '@nestjs/core';
import {
  AUTHENTICATED_KEY,
  PUBLIC_KEY,
  REQUIRE_PERMISSION_KEY,
  SECOND_FACTOR_STAGE_KEY,
} from '../common/decorators/access.decorators';

const DECORATIONS = [
  PUBLIC_KEY,
  REQUIRE_PERMISSION_KEY,
  AUTHENTICATED_KEY,
  SECOND_FACTOR_STAGE_KEY,
];

@Injectable()
export class RbacRouteAudit implements OnApplicationBootstrap {
  private readonly logger = new Logger('RbacRouteAudit');

  constructor(
    @Inject(ModulesContainer) private readonly modules: ModulesContainer,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  onApplicationBootstrap(): void {
    const offenders = this.findUndecoratedRoutes();
    if (offenders.length === 0) return;
    for (const route of offenders)
      this.logger.error(`Route is missing an access decorator: ${route}`);
    throw new Error(
      `RbacRouteAudit: ${offenders.length} route(s) without @RequirePermission/@Public/@Authenticated`,
    );
  }

  findUndecoratedRoutes(): string[] {
    const offenders: string[] = [];
    for (const module of this.modules.values()) {
      for (const wrapper of module.controllers?.values() ?? []) {
        const controller = wrapper.metatype;
        if (typeof controller !== 'function') continue;
        const basePath = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '');
        const modulePath = String(Reflect.getMetadata(MODULE_PATH, controller.constructor) ?? '');
        const proto: object = controller.prototype as object;
        for (const name of Object.getOwnPropertyNames(proto)) {
          if (name === 'constructor') continue;
          const handler = (proto as Record<string, unknown>)[name];
          if (typeof handler !== 'function') continue;
          if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;
          const decorated = DECORATIONS.some(
            (key) => this.reflector.getAllAndOverride(key, [handler, controller]) !== undefined,
          );
          if (!decorated) offenders.push(`${modulePath}/${basePath} ${controller.name}.${name}`);
        }
      }
    }
    return offenders;
  }
}
