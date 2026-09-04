import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/access.decorators';
import { paginate, parseListQuery } from '../common/query/list-query';
import { AuditService } from './audit.service';

const FILTERS = ['resourceType', 'resourceId', 'actorId', 'from', 'to'] as const;

function parseDate(value: string | undefined, name: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${name} must be an ISO date`);
  return d;
}

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission('audit:view')
  async list(@Query() raw: Record<string, unknown>) {
    const q = parseListQuery(raw, { filters: FILTERS });
    const { items, total } = await this.audit.list(
      {
        resourceType: q.filter.resourceType,
        resourceId: q.filter.resourceId,
        actorId: q.filter.actorId,
        from: parseDate(q.filter.from, 'from'),
        to: parseDate(q.filter.to, 'to'),
      },
      q.page,
      q.pageSize,
    );
    return paginate(items, total, q);
  }
}
