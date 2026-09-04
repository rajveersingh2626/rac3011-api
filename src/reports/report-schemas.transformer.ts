import type { ReportFieldRow, ReportSchemaRow, ReportSchemaWithFields } from './reports.types';

export function reportFieldDto(row: ReportFieldRow) {
  return {
    id: row.id,
    section: row.section,
    fieldKey: row.fieldKey,
    label: row.label,
    type: row.type,
    options: row.options ?? null,
    required: row.required,
    order: row.order,
    helpText: row.helpText,
    perActivity: row.perActivity,
    pointSourceKey: row.pointSourceKey,
  };
}

export function reportSchemaSummaryDto(row: ReportSchemaRow) {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

export function reportSchemaDto(row: ReportSchemaWithFields) {
  return {
    ...reportSchemaSummaryDto(row),
    fields: row.fields.map(reportFieldDto),
  };
}
