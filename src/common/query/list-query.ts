import { BadRequestException } from '@nestjs/common';

export type SortSpec = { field: string; direction: 'asc' | 'desc' };

export type ListQuery<F extends string = string, I extends string = string> = {
  filter: Partial<Record<F, string>>;
  sort: SortSpec | undefined;
  page: number;
  pageSize: number;
  include: I[];
  q: string | undefined;
};

export type ListQueryOptions<F extends string, I extends string> = {
  filters: readonly F[];
  includes?: readonly I[];
  sortable?: readonly string[];
  defaultSort?: SortSpec;
  maxPageSize?: number;
};

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };

type RawQuery = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function parseIntParam(raw: unknown, name: string, fallback: number, max?: number): number {
  const s = asString(raw);
  if (s === undefined || s === '') return fallback;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1)
    throw new BadRequestException(`${name} must be a positive integer`);
  return max !== undefined ? Math.min(n, max) : n;
}

function collectFilters<F extends string>(
  raw: RawQuery,
  allowed: readonly F[],
): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  const nested = raw.filter;
  const pairs: [string, unknown][] = [];
  if (nested && typeof nested === 'object') pairs.push(...Object.entries(nested as RawQuery));
  for (const [k, v] of Object.entries(raw)) {
    const m = /^filter\[(.+)\]$/.exec(k);
    if (m) pairs.push([m[1], v]);
  }
  for (const [key, value] of pairs) {
    if (!(allowed as readonly string[]).includes(key)) {
      throw new BadRequestException(`Unknown filter "${key}"`);
    }
    const s = asString(value);
    if (s !== undefined && s !== '') out[key as F] = s;
  }
  return out;
}

export function parseListQuery<F extends string, I extends string = never>(
  raw: RawQuery,
  options: ListQueryOptions<F, I>,
): ListQuery<F, I> {
  const maxPageSize = options.maxPageSize ?? 100;
  const includeRaw = asString(raw.include);
  const include = includeRaw
    ? includeRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  for (const inc of include) {
    if (!(options.includes ?? []).includes(inc as I))
      throw new BadRequestException(`Unknown include "${inc}"`);
  }
  let sort = options.defaultSort;
  const sortRaw = asString(raw.sort);
  if (sortRaw) {
    const direction: 'asc' | 'desc' = sortRaw.startsWith('-') ? 'desc' : 'asc';
    const field = sortRaw.replace(/^-/, '');
    if (!(options.sortable ?? []).includes(field))
      throw new BadRequestException(`Cannot sort by "${field}"`);
    sort = { field, direction };
  }
  const q = asString(raw.q);
  return {
    filter: collectFilters(raw, options.filters),
    sort,
    page: parseIntParam(raw.page, 'page', 1),
    pageSize: parseIntParam(raw.pageSize, 'pageSize', 25, maxPageSize),
    include: include as I[],
    q: q ? q.trim() || undefined : undefined,
  };
}

export function paginate<T>(
  items: T[],
  total: number,
  query: { page: number; pageSize: number },
): Paginated<T> {
  return { items, total, page: query.page, pageSize: query.pageSize };
}
