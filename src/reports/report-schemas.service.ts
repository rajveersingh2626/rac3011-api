import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ResolvedAccess } from '../common/types/access';
import { AuditService } from '../audit/audit.service';
import type { ReportFieldInputDto, UpdateReportSchemaInput } from './dto/report-schema.dto';
import { ReportSchemasRepository } from './report-schemas.repository';
import type { ReportFieldRow, ReportSchemaRow, ReportSchemaWithFields } from './reports.types';

function assertUniqueFieldKeys(fields: ReportFieldInputDto[]): void {
  const seen = new Set<string>();
  for (const f of fields) {
    if (seen.has(f.fieldKey)) throw new BadRequestException(`Duplicate fieldKey "${f.fieldKey}"`);
    seen.add(f.fieldKey);
  }
}

@Injectable()
export class ReportSchemasService {
  constructor(
    private readonly repo: ReportSchemasRepository,
    private readonly audit: AuditService,
  ) {}

  async list(
    access: ResolvedAccess,
    version?: number,
    includeFields = false,
  ): Promise<ReportSchemaRow[]> {
    const canManage = (access.grants['requests:manage'] ?? []).length > 0;
    if (access.isSuperAdmin || canManage)
      return this.repo.findMany(undefined, version, includeFields);
    return this.repo.findMany(['active'], version, includeFields);
  }

  async getActive(): Promise<ReportSchemaWithFields> {
    const schema = await this.repo.findActive();
    if (!schema) throw new NotFoundException('No active report schema');
    return schema;
  }

  async getActiveFields(): Promise<ReportFieldRow[]> {
    return (await this.getActive()).fields;
  }

  async getByVersion(version: number): Promise<ReportSchemaWithFields> {
    const schema = await this.repo.findByVersion(version);
    if (!schema) throw new NotFoundException();
    return schema;
  }

  async create(access: ResolvedAccess): Promise<ReportSchemaWithFields> {
    const base = await this.repo.findActive();
    const nextVersion = (await this.repo.maxVersion()) + 1;
    const fields = (base?.fields ?? []).map((f) => ({
      section: f.section,
      fieldKey: f.fieldKey,
      label: f.label,
      type: f.type,
      options: f.options,
      required: f.required,
      order: f.order,
      helpText: f.helpText,
      perActivity: f.perActivity,
      pointSourceKey: f.pointSourceKey,
    }));
    const created = await this.repo.createDraft(nextVersion, fields, access.userId);
    await this.audit.record({
      actorId: access.userId,
      action: 'report_schema.drafted',
      resourceType: 'report_form_schema',
      resourceId: created.id,
      after: { version: created.version },
    });
    return created;
  }

  async update(
    access: ResolvedAccess,
    version: number,
    input: UpdateReportSchemaInput,
  ): Promise<ReportSchemaWithFields> {
    const schema = await this.repo.findByVersion(version);
    if (!schema) throw new NotFoundException();

    if (input.fields) {
      if (schema.status !== 'draft') {
        throw new ConflictException({
          code: 'INVALID_TRANSITION',
          message: 'Only a draft schema can have its fields edited',
        });
      }
      assertUniqueFieldKeys(input.fields);
      await this.repo.replaceFields(schema.id, input.fields);
      await this.audit.record({
        actorId: access.userId,
        action: 'report_schema.fields_updated',
        resourceType: 'report_form_schema',
        resourceId: schema.id,
        before: { fieldCount: schema.fields.length },
        after: { fieldCount: input.fields.length },
      });
    }

    if (input.status === 'active') {
      if (schema.status === 'active')
        throw new ConflictException({ code: 'INVALID_TRANSITION', message: 'Already active' });
      await this.repo.publish(schema.id);
      await this.audit.record({
        actorId: access.userId,
        action: 'report_schema.published',
        resourceType: 'report_form_schema',
        resourceId: schema.id,
        after: { version: schema.version },
      });
    }

    return this.getByVersion(version);
  }
}
