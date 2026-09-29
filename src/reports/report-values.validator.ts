import type { ReportFieldRow } from './reports.types';

export interface ValidationError {
  path: string;
  message: string;
}

export type ValidateResult =
  { valid: true; errors: [] } | { valid: false; errors: ValidationError[] };

const NOTES_FIELD_KEY = 'notes';

function selectChoices(options: unknown): string[] {
  if (
    options &&
    typeof options === 'object' &&
    Array.isArray((options as { choices?: unknown }).choices)
  ) {
    return (options as { choices: string[] }).choices;
  }
  return [];
}

function linkAllowsMultiple(options: unknown): boolean {
  return (
    !!options &&
    typeof options === 'object' &&
    (options as { multiple?: boolean }).multiple === true
  );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\//i;

export const AVENUE_MAP: Record<string, string> = {
  club: 'club',
  'club services': 'club',
  'club service': 'club',
  'club meetings': 'club',
  'club meeting': 'club',
  meetings: 'club',
  meeting: 'club',

  community: 'community',
  'community services': 'community',
  'community service': 'community',

  international: 'international',
  'international services': 'international',
  'international service': 'international',

  vocational: 'vocational',
  'vocational services': 'vocational',
  'vocational service': 'vocational',

  district: 'district',
  'district projects': 'district',
  'district project': 'district',
  'district service': 'district',

  flagship: 'flagship',
  'flagship projects': 'flagship',
  'flagship project': 'flagship',
  'flagship initiatives': 'flagship',
};

export function normalizeAvenue(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim().toLowerCase();
  return AVENUE_MAP[trimmed] || trimmed;
}

export function normalizeReportValues(values: unknown): unknown {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return values;
  const obj = { ...(values as Record<string, unknown>) };
  if (Array.isArray(obj.activities)) {
    obj.activities = obj.activities.map((act) => {
      if (!act || typeof act !== 'object' || Array.isArray(act)) return act;
      const actObj = { ...(act as Record<string, unknown>) };
      if (typeof actObj.avenue === 'string') {
        actObj.avenue = normalizeAvenue(actObj.avenue);
      }
      return actObj;
    });
  }
  return obj;
}

function validateScalar(
  field: ReportFieldRow,
  value: unknown,
  path: string,
  validClubIds: ReadonlySet<string>,
  errors: ValidationError[],
  isSubmitting: boolean = true,
): void {
  const missing = value === undefined || value === null || value === '';
  if (missing) {
    if (field.required && isSubmitting) errors.push({ path, message: `${field.label} is required` });
    return;
  }
  switch (field.type) {
    case 'text':
    case 'textarea':
      if (typeof value !== 'string') errors.push({ path, message: `${field.label} must be text` });
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value))
        errors.push({ path, message: `${field.label} must be a number` });
      break;
    case 'boolean':
      if (typeof value !== 'boolean')
        errors.push({ path, message: `${field.label} must be true or false` });
      break;
    case 'date':
      if (typeof value !== 'string' || !DATE_RE.test(value))
        errors.push({ path, message: `${field.label} must be a YYYY-MM-DD date` });
      break;
    case 'select': {
      const choices = selectChoices(field.options);
      let testVal = value;
      if (field.fieldKey === 'avenue' || choices.includes('community')) {
        testVal = normalizeAvenue(value);
      }
      if (typeof testVal !== 'string' || !choices.includes(testVal))
        errors.push({ path, message: `${field.label} must be one of ${choices.join(', ')}` });
      break;
    }
    case 'multiselect': {
      const choices = selectChoices(field.options);
      if (
        !Array.isArray(value) ||
        !value.every((v) => typeof v === 'string' && choices.includes(v))
      )
        errors.push({ path, message: `${field.label} must be a subset of ${choices.join(', ')}` });
      break;
    }
    case 'link': {
      const urls = linkAllowsMultiple(field.options) ? value : [value];
      if (!Array.isArray(urls) || !urls.every((u) => typeof u === 'string' && URL_RE.test(u)))
        errors.push({ path, message: `${field.label} must be a valid URL` });
      break;
    }
    case 'clubs': {
      if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
        errors.push({ path, message: `${field.label} must be a list of club ids` });
        break;
      }
      for (const clubId of value) {
        if (!validClubIds.has(clubId))
          errors.push({ path, message: `${clubId} is not a known club` });
      }
      break;
    }
  }
}

export function validateReportValues(
  fields: ReportFieldRow[],
  values: unknown,
  validClubIds: ReadonlySet<string>,
  isSubmitting: boolean = true,
): ValidateResult {
  const errors: ValidationError[] = [];
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    return { valid: false, errors: [{ path: 'values', message: 'values must be an object' }] };
  }
  const obj = values as Record<string, unknown>;
  const topFields = fields.filter((f) => !f.perActivity && f.fieldKey !== NOTES_FIELD_KEY);
  const activityFields = fields.filter((f) => f.perActivity);
  const knownTopKeys = new Set([...topFields.map((f) => f.fieldKey), 'activities']);

  for (const key of Object.keys(obj)) {
    if (!knownTopKeys.has(key)) errors.push({ path: key, message: `Unknown field "${key}"` });
  }
  for (const field of topFields) {
    validateScalar(field, obj[field.fieldKey], field.fieldKey, validClubIds, errors, isSubmitting);
  }

  const activities = obj.activities;
  if (activities !== undefined && !Array.isArray(activities)) {
    errors.push({ path: 'activities', message: 'activities must be a list' });
  } else if (Array.isArray(activities)) {
    const knownActivityKeys = new Set(activityFields.map((f) => f.fieldKey));
    activities.forEach((activity, index) => {
      if (typeof activity !== 'object' || activity === null || Array.isArray(activity)) {
        errors.push({ path: `activities[${index}]`, message: 'must be an object' });
        return;
      }
      const activityObj = activity as Record<string, unknown>;
      for (const key of Object.keys(activityObj)) {
        if (!knownActivityKeys.has(key)) {
          errors.push({ path: `activities[${index}].${key}`, message: `Unknown field "${key}"` });
        }
      }
      for (const field of activityFields) {
        validateScalar(
          field,
          activityObj[field.fieldKey],
          `activities[${index}].${field.fieldKey}`,
          validClubIds,
          errors,
          isSubmitting,
        );
      }
    });
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

export function collectClubIdsInValues(fields: ReportFieldRow[], values: unknown): string[] {
  if (typeof values !== 'object' || values === null) return [];
  const obj = values as Record<string, unknown>;
  const ids = new Set<string>();
  const addFrom = (field: ReportFieldRow, container: Record<string, unknown>) => {
    if (field.type !== 'clubs') return;
    const value = container[field.fieldKey];
    if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') ids.add(v);
  };
  for (const field of fields.filter((f) => !f.perActivity)) addFrom(field, obj);
  const activities = Array.isArray(obj.activities) ? obj.activities : [];
  for (const activity of activities) {
    if (typeof activity !== 'object' || activity === null) continue;
    for (const field of fields.filter((f) => f.perActivity))
      addFrom(field, activity as Record<string, unknown>);
  }
  return [...ids];
}
