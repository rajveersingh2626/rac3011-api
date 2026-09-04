import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ReportFieldInput,
  ReportFieldRow,
  ReportSchemaRow,
  ReportSchemaWithFields,
  SchemaStatus,
} from './reports.types';

@Injectable()
export class ReportSchemasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    statuses?: SchemaStatus[],
    version?: number,
    includeFields = false,
  ): Promise<ReportSchemaRow[]> {
    return this.prisma.reportFormSchema.findMany({
      where: {
        status: statuses ? { in: statuses } : undefined,
        version,
      },
      orderBy: { version: 'desc' },
      include: includeFields ? { fields: { orderBy: { order: 'asc' } } } : undefined,
    });
  }

  async findByVersion(version: number): Promise<ReportSchemaWithFields | null> {
    const row = await this.prisma.reportFormSchema.findUnique({
      where: { version },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    return row;
  }

  async findActive(): Promise<ReportSchemaWithFields | null> {
    const row = await this.prisma.reportFormSchema.findFirst({
      where: { status: 'active' },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    return row;
  }

  async maxVersion(): Promise<number> {
    const row = await this.prisma.reportFormSchema.findFirst({ orderBy: { version: 'desc' } });
    return row?.version ?? 0;
  }

  async createDraft(
    version: number,
    fields: ReportFieldInput[],
    createdById: string | null,
  ): Promise<ReportSchemaWithFields> {
    const row = await this.prisma.reportFormSchema.create({
      data: {
        version,
        status: 'draft',
        createdById,
        fields: {
          create: fields.map((f) => ({
            section: f.section,
            fieldKey: f.fieldKey,
            label: f.label,
            type: f.type,
            options: f.options as never,
            required: f.required ?? false,
            order: f.order,
            helpText: f.helpText ?? null,
            perActivity: f.perActivity ?? false,
            pointSourceKey: f.pointSourceKey ?? null,
          })),
        },
      },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    return row;
  }

  async replaceFields(schemaId: string, fields: ReportFieldInput[]): Promise<ReportFieldRow[]> {
    await this.prisma.$transaction([
      this.prisma.reportFormField.deleteMany({ where: { schemaId } }),
      this.prisma.reportFormField.createMany({
        data: fields.map((f) => ({
          schemaId,
          section: f.section,
          fieldKey: f.fieldKey,
          label: f.label,
          type: f.type,
          options: f.options as never,
          required: f.required ?? false,
          order: f.order,
          helpText: f.helpText ?? null,
          perActivity: f.perActivity ?? false,
          pointSourceKey: f.pointSourceKey ?? null,
        })),
      }),
    ]);
    return this.prisma.reportFormField.findMany({ where: { schemaId }, orderBy: { order: 'asc' } });
  }

  async publish(schemaId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.reportFormSchema.updateMany({
        where: { status: 'active' },
        data: { status: 'retired' },
      }),
      this.prisma.reportFormSchema.update({
        where: { id: schemaId },
        data: { status: 'active', publishedAt: new Date() },
      }),
    ]);
  }
}
