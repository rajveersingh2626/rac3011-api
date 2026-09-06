import { describe, expect, it } from 'vitest';
import {
  drrSlug,
  mapDrrRecord,
  mergeDrrFields,
  resolveHomeClubId,
  type ExistingDrrRow,
} from './drr-mapper';
import type { ScrapedDrr } from './legacy-import.types';

function drr(overrides: Partial<ScrapedDrr> = {}): ScrapedDrr {
  return {
    id: 'drr-45',
    srNo: 45,
    year: '2026-27',
    tenure: 'RY 2026-27',
    name: 'Rtr. Archit Bhatia',
    district: '3011',
    districtEra: 'District 3011',
    homeClub: 'Rotaract Club of Delhi Heights',
    photo: 'archit-bhatia',
    hasPhoto: true,
    ...overrides,
  };
}

describe('drrSlug', () => {
  it('uses the photo key when present', () => {
    expect(drrSlug(drr())).toBe('archit-bhatia');
  });

  it('falls back to name+year when there is no photo', () => {
    expect(
      drrSlug(drr({ photo: null, hasPhoto: false, name: 'Rtr. Rajeev Raheja', year: '1984-85' })),
    ).toBe('rtr-rajeev-raheja-1984-85');
  });
});

describe('resolveHomeClubId', () => {
  it('resolves a real club name to its id', () => {
    const map = new Map([['rotaract club of delhi heights', 'RAC-DELHI-HEIGHTS']]);
    expect(resolveHomeClubId('Rotaract Club of Delhi Heights', map)).toBe('RAC-DELHI-HEIGHTS');
  });

  it('treats generic district filler as unresolvable, not a club match', () => {
    const map = new Map([['district 301', 'RAC-SOMETHING']]);
    expect(resolveHomeClubId('District 301', map)).toBeNull();
  });

  it('treats "District 3010" as unresolvable (predecessor district, the most common value in the real data)', () => {
    expect(resolveHomeClubId('District 3010', new Map())).toBeNull();
  });

  it('returns null when there is no matching club', () => {
    expect(resolveHomeClubId('Some Unknown Club', new Map())).toBeNull();
  });
});

describe('mapDrrRecord', () => {
  it('links a resolvable home club and leaves bio empty', () => {
    const map = new Map([['rotaract club of delhi heights', 'RAC-DELHI-HEIGHTS']]);
    const mapped = mapDrrRecord(drr(), map);
    expect(mapped.homeClubId).toBe('RAC-DELHI-HEIGHTS');
    expect(mapped.bio).toBeNull();
    expect(mapped.terms).toEqual(['2026-27']);
    expect(mapped.order).toBe(45);
    expect(mapped.photoKey).toBe('archit-bhatia');
  });

  it('records the raw home club text in bio when unresolvable', () => {
    const mapped = mapDrrRecord(
      drr({ homeClub: 'District 301', name: 'Rtr. Rajeev Raheja' }),
      new Map(),
    );
    expect(mapped.homeClubId).toBeNull();
    expect(mapped.bio).toBe('Home club: District 301');
  });

  it('has no photo key when hasPhoto is false', () => {
    const mapped = mapDrrRecord(drr({ hasPhoto: false, photo: null }), new Map());
    expect(mapped.photoKey).toBeNull();
  });
});

describe('mergeDrrFields', () => {
  const mapped = mapDrrRecord(
    drr(),
    new Map([['rotaract club of delhi heights', 'RAC-DELHI-HEIGHTS']]),
  );

  it('does not clobber a hand-edited bio on a re-run', () => {
    const existing: ExistingDrrRow = {
      name: 'Rtr. Archit Bhatia',
      terms: ['2026-27'],
      homeClubId: 'RAC-DELHI-HEIGHTS',
      bio: 'A real, hand-written biography added by an admin after the first import.',
    };
    const data = mergeDrrFields(existing, mapped, null);
    expect(data.bio).toBeUndefined();
  });

  it('does not clobber a manually-corrected homeClubId on a re-run', () => {
    const existing: ExistingDrrRow = {
      name: 'Rtr. Archit Bhatia',
      terms: ['2026-27'],
      homeClubId: 'RAC-SOME-OTHER-CLUB',
      bio: null,
    };
    const data = mergeDrrFields(existing, mapped, null);
    expect(data.homeClubId).toBeUndefined();
  });

  it('fills bio/homeClubId when a prior run left them empty', () => {
    const existing: ExistingDrrRow = {
      name: 'Rtr. Archit Bhatia',
      terms: ['2026-27'],
      homeClubId: null,
      bio: null,
    };
    const data = mergeDrrFields(existing, mapped, null);
    expect(data.homeClubId).toBe('RAC-DELHI-HEIGHTS');
  });

  it('sets photoUrl only when a fresh upload happened this run', () => {
    const existing: ExistingDrrRow = {
      name: 'Rtr. Archit Bhatia',
      terms: ['2026-27'],
      homeClubId: 'RAC-DELHI-HEIGHTS',
      bio: null,
    };
    expect(mergeDrrFields(existing, mapped, null).photoUrl).toBeUndefined();
    expect(mergeDrrFields(existing, mapped, 'https://utfs.io/f/new-photo').photoUrl).toBe(
      'https://utfs.io/f/new-photo',
    );
  });

  it('produces no updates at all once a record is fully filled and no new photo arrived', () => {
    const existing: ExistingDrrRow = {
      name: 'Rtr. Archit Bhatia',
      terms: ['2026-27'],
      homeClubId: 'RAC-DELHI-HEIGHTS',
      bio: 'already has a bio',
    };
    expect(mergeDrrFields(existing, mapped, null)).toEqual({});
  });
});
