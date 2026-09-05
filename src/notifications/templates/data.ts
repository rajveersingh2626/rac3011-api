export type TemplateData = Record<string, unknown>;

export function str(data: TemplateData, key: string, fallback = ''): string {
  const value = data[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

// A trailing clause that only appears when the field was actually sent, e.g.
// optionalSuffix(data, 'score', (v) => `: ${v} points`) -> '' when data.score is missing.
export function optionalSuffix(
  data: TemplateData,
  key: string,
  format: (value: string) => string,
): string {
  const value = str(data, key);
  return value === '' ? '' : format(value);
}

// A public detail-page path built from a slug, falling back to a listing page when
// the slug isn't in data (e.g. an admin-side notify() call that has no public slug yet).
export function slugPath(data: TemplateData, base: string, fallback: string): string {
  const slug = str(data, 'slug');
  return slug === '' ? fallback : `${base}/${slug}`;
}
