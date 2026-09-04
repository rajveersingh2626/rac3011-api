import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { parseListQuery } from './list-query';

const opts = {
  filters: ['status', 'clubId'] as const,
  includes: ['club'] as const,
  sortable: ['createdAt'],
};

describe('parseListQuery', () => {
  it('parses bracket filters, sort, paging and include', () => {
    const q = parseListQuery(
      {
        'filter[status]': 'submitted',
        filter: { clubId: 'A' },
        sort: '-createdAt',
        page: '2',
        pageSize: '10',
        include: 'club',
      },
      opts,
    );
    expect(q.filter).toEqual({ status: 'submitted', clubId: 'A' });
    expect(q.sort).toEqual({ field: 'createdAt', direction: 'desc' });
    expect(q.page).toBe(2);
    expect(q.pageSize).toBe(10);
    expect(q.include).toEqual(['club']);
  });

  it('applies defaults and caps pageSize', () => {
    const q = parseListQuery({ pageSize: '5000' }, opts);
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(100);
    expect(q.include).toEqual([]);
  });

  it('rejects unknown filters, includes and sort fields', () => {
    expect(() => parseListQuery({ 'filter[zone]': 'x' }, opts)).toThrow(BadRequestException);
    expect(() => parseListQuery({ include: 'secrets' }, opts)).toThrow(BadRequestException);
    expect(() => parseListQuery({ sort: 'email' }, opts)).toThrow(BadRequestException);
    expect(() => parseListQuery({ page: '0' }, opts)).toThrow(BadRequestException);
  });
});
