export type SchemaStatus = 'draft' | 'active' | 'retired';
export type ReportFieldType =
  'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'link' | 'date' | 'boolean' | 'clubs';
export type ReportStatus = 'draft' | 'submitted' | 'queried' | 'scored';

export interface ReportFieldRow {
  id: string;
  schemaId: string;
  section: string;
  fieldKey: string;
  label: string;
  type: ReportFieldType;
  options: unknown;
  required: boolean;
  order: number;
  helpText: string | null;
  perActivity: boolean;
  pointSourceKey: string | null;
}

export interface ReportFieldInput {
  section: string;
  fieldKey: string;
  label: string;
  type: ReportFieldType;
  options?: unknown;
  required?: boolean;
  order: number;
  helpText?: string | null;
  perActivity?: boolean;
  pointSourceKey?: string | null;
}

export interface ReportSchemaRow {
  id: string;
  version: number;
  status: SchemaStatus;
  publishedAt: Date | null;
  createdById: string | null;
}

export interface ReportSchemaWithFields extends ReportSchemaRow {
  fields: ReportFieldRow[];
}

export interface ReportRow {
  id: string;
  clubId: string;
  ryYear: number;
  month: Date;
  schemaVersion: number;
  status: ReportStatus;
  values: unknown;
  notes: string | null;
  submittedById: string | null;
  submittedAt: Date | null;
  filedOnTime: boolean | null;
  scoredAt: Date | null;
  legacyId: string | null;
}

export interface ReportQueryRow {
  id: string;
  reportId: string;
  askedById: string;
  question: string;
  reply: string | null;
  repliedById: string | null;
  repliedAt: Date | null;
  createdAt: Date;
}

export interface ReportWithRelations extends ReportRow {
  queries?: ReportQueryRow[];
  club?: { id: string; name: string; shortName: string | null; zoneId: string | null };
}

export type ReportListFilter = {
  clubId?: string;
  ryYear?: number;
  month?: string;
  status?: ReportStatus;
};

export type ReportRequestRow = {
  id: string;
  title: string;
  description: string | null;
  questions: unknown;
  audience: unknown;
  dueAt: Date;
  createdById: string;
};

export type ReportRequestResponseRow = {
  id: string;
  requestId: string;
  clubId: string;
  answers: unknown;
  submittedById: string;
};

export type ReportRequestAudience = {
  all?: boolean;
  clubIds?: string[];
  zoneIds?: string[];
};
