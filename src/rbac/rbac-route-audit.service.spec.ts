import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Public, RequirePermission } from '../common/decorators/access.decorators';
import { RbacRouteAudit } from './rbac-route-audit.service';

@Controller('undecorated')
class UndecoratedController {
  @Get()
  list(): string {
    return 'no decorator here';
  }
}

@Controller('decorated')
class DecoratedController {
  @Get('public')
  @Public()
  publicRoute(): string {
    return 'ok';
  }

  @Get('gated')
  @RequirePermission('clubs:view')
  gatedRoute(): string {
    return 'ok';
  }
}

describe('RbacRouteAudit', () => {
  it('flags a route with no @Public/@Authenticated/@RequirePermission decorator', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UndecoratedController],
      providers: [RbacRouteAudit],
    }).compile();
    const audit = moduleRef.get(RbacRouteAudit);

    const offenders = audit.findUndecoratedRoutes();

    expect(offenders).toHaveLength(1);
    expect(offenders[0]).toContain('UndecoratedController.list');
  });

  it('passes every route once decorated, and onApplicationBootstrap throws when it does not', async () => {
    const cleanModule = await Test.createTestingModule({
      controllers: [DecoratedController],
      providers: [RbacRouteAudit],
    }).compile();
    const cleanAudit = cleanModule.get(RbacRouteAudit);
    expect(cleanAudit.findUndecoratedRoutes()).toEqual([]);
    expect(() => cleanAudit.onApplicationBootstrap()).not.toThrow();

    const dirtyModule = await Test.createTestingModule({
      controllers: [UndecoratedController],
      providers: [RbacRouteAudit],
    }).compile();
    const dirtyAudit = dirtyModule.get(RbacRouteAudit);
    expect(() => dirtyAudit.onApplicationBootstrap()).toThrow(/route\(s\) without/);
  });
});
