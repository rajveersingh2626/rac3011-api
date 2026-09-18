import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheInvalidator } from '../../cache/cache-invalidator.service';
import { ScopeService } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import type { CreateRideResourceInput, RideResourceFilter } from './dto/ride-resource.dto';
import { RideResourcesRepository } from './ride-resources.repository';

const MANAGE_PERMISSION = 'subdomain:ride:manage' as const;

@Injectable()
export class RideResourcesService {
  constructor(
    private readonly repo: RideResourcesRepository,
    private readonly scope: ScopeService,
    private readonly cache: CacheInvalidator,
  ) {}

  list(filter: RideResourceFilter, page: number = 1, pageSize: number = 50) {
    return this.repo.findMany(filter, page, pageSize);
  }

  listForParticipant(email?: string, clubName?: string, district?: string) {
    return this.repo.findAllForParticipant(email, clubName, district);
  }

  async create(ctx: RequestContext, input: CreateRideResourceInput) {
    this.assertManage(ctx);
    const created = await this.repo.create(input);
    await this.cache.purge(['ride']);
    return created;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    this.assertManage(ctx);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Resource not found');
    await this.repo.delete(id);
    await this.cache.purge(['ride']);
  }

  private assertManage(ctx: RequestContext): void {
    if (!this.hasManageGrant(ctx)) throw new ForbiddenException();
    this.scope.assertCanAccessProject(ctx.access, MANAGE_PERMISSION, 'ride');
  }

  private hasManageGrant(ctx: RequestContext): boolean {
    return ctx.access.isSuperAdmin || (ctx.access.grants[MANAGE_PERMISSION] ?? []).length > 0;
  }
}
