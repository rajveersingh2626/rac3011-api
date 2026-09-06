import { describe, expect, it } from 'vitest';
import { isPlaceholderClub, mergeClubFields, slugify } from './club-mapper';
import type { ExistingClubRow, ScrapedClub } from './legacy-import.types';

function scrapedClub(overrides: Partial<ScrapedClub> = {}): ScrapedClub {
  return {
    id: 'c1',
    name: 'Rotaract Club of Test',
    short_name: 'Test',
    zone: 'Zone Vayu',
    lat: 28.6,
    lng: 77.2,
    president: 'Rtr. Real President',
    is_director: '',
    phone: '9999999999',
    email: 'president@example.org',
    rotary_id: '12345',
    secretary: 'Rtr. Real Secretary',
    secretary_email: 'secretary@example.org',
    secretary_phone: '8888888888',
    initiatives: [],
    created_at: '2026-09-03T00:00:00Z',
    updated_at: '2026-09-03T00:00:00Z',
    ...overrides,
  };
}

describe('slugify', () => {
  it('produces a lowercase hyphenated slug', () => {
    expect(slugify('Rotaract Club of Delhi Heights')).toBe('rotaract-club-of-delhi-heights');
  });
});

describe('isPlaceholderClub', () => {
  it('flags the documented placeholder president/secretary pair', () => {
    expect(
      isPlaceholderClub(
        scrapedClub({ president: 'Rtr. Club President', secretary: 'Rtr. Club Secretary' }),
      ),
    ).toBe(true);
  });

  it('does not flag a club with a real president and secretary', () => {
    expect(isPlaceholderClub(scrapedClub())).toBe(false);
  });
});

describe('mergeClubFields', () => {
  it('creates a new club without officer fields when the scrape is placeholder-only', () => {
    const scraped = scrapedClub({
      president: 'Rtr. Club President',
      secretary: 'Rtr. Club Secretary',
    });
    const result = mergeClubFields(null, scraped);
    expect(result.action).toBe('create');
    if (result.action !== 'create') throw new Error('expected create');
    expect(result.data.president).toBeUndefined();
    expect(result.data.rotaryId).toBe('12345');
  });

  it('creates a new club with officer fields when the scrape has real data', () => {
    const result = mergeClubFields(null, scrapedClub());
    expect(result.action).toBe('create');
    if (result.action !== 'create') throw new Error('expected create');
    expect(result.data.president).toBe('Rtr. Real President');
  });

  it('never overwrites an existing non-empty field', () => {
    const existing: ExistingClubRow = {
      id: 'RAC-TEST',
      name: 'Rotaract Club of Test',
      shortName: 'Test',
      zone: 'Zone Vayu',
      lat: 28.6,
      lng: 77.2,
      president: 'Rtr. Existing President',
      phone: '7777777777',
      email: 'existing@example.org',
      rotaryId: '99999',
      secretary: 'Rtr. Existing Secretary',
      secretaryEmail: 'existing-secretary@example.org',
      secretaryPhone: '6666666666',
    };
    const result = mergeClubFields(existing, scrapedClub());
    expect(result.action).toBe('noop');
  });

  it('fills only empty fields on an existing club, and skips officer fields for a placeholder scrape', () => {
    const existing: ExistingClubRow = {
      id: 'RAC-TEST',
      name: 'Rotaract Club of Test',
      shortName: 'Test',
      zone: null,
      lat: null,
      lng: null,
      president: null,
      phone: null,
      email: null,
      rotaryId: null,
      secretary: null,
      secretaryEmail: null,
      secretaryPhone: null,
    };
    const scraped = scrapedClub({
      president: 'Rtr. Club President',
      secretary: 'Rtr. Club Secretary',
    });
    const result = mergeClubFields(existing, scraped);
    expect(result.action).toBe('update');
    if (result.action !== 'update') throw new Error('expected update');
    const fields = result.updates.map((u) => u.field);
    expect(fields).toContain('zone');
    expect(fields).toContain('rotaryId');
    expect(fields).not.toContain('president');
    expect(fields).not.toContain('secretary');
  });

  it('skips only the placeholder role when a club has a real president but placeholder secretary', () => {
    // Regression: two real clubs in the scrape have exactly this mixed shape.
    const existing: ExistingClubRow = {
      id: 'RAC-TEST',
      name: 'Rotaract Club of Test',
      shortName: 'Test',
      zone: 'Zone Vayu',
      lat: 28.6,
      lng: 77.2,
      president: null,
      phone: null,
      email: null,
      rotaryId: '12345',
      secretary: null,
      secretaryEmail: null,
      secretaryPhone: null,
    };
    const scraped = scrapedClub({ secretary: 'Rtr. Club Secretary' });
    const result = mergeClubFields(existing, scraped);
    expect(result.action).toBe('update');
    if (result.action !== 'update') throw new Error('expected update');
    const byField = Object.fromEntries(result.updates.map((u) => [u.field, u.value]));
    expect(byField.president).toBe('Rtr. Real President');
    expect(byField.secretary).toBeUndefined();
  });

  it('skips only the placeholder role when a club has a real secretary but placeholder president', () => {
    const existing: ExistingClubRow = {
      id: 'RAC-TEST',
      name: 'Rotaract Club of Test',
      shortName: 'Test',
      zone: 'Zone Vayu',
      lat: 28.6,
      lng: 77.2,
      president: null,
      phone: null,
      email: null,
      rotaryId: '12345',
      secretary: null,
      secretaryEmail: null,
      secretaryPhone: null,
    };
    const scraped = scrapedClub({ president: 'Rtr. Club President' });
    const result = mergeClubFields(existing, scraped);
    expect(result.action).toBe('update');
    if (result.action !== 'update') throw new Error('expected update');
    const byField = Object.fromEntries(result.updates.map((u) => [u.field, u.value]));
    expect(byField.president).toBeUndefined();
    expect(byField.secretary).toBe('Rtr. Real Secretary');
  });

  it('fills empty officer fields on an existing club from a non-placeholder scrape', () => {
    const existing: ExistingClubRow = {
      id: 'RAC-TEST',
      name: 'Rotaract Club of Test',
      shortName: 'Test',
      zone: 'Zone Vayu',
      lat: 28.6,
      lng: 77.2,
      president: null,
      phone: null,
      email: null,
      rotaryId: '12345',
      secretary: null,
      secretaryEmail: null,
      secretaryPhone: null,
    };
    const result = mergeClubFields(existing, scrapedClub());
    expect(result.action).toBe('update');
    if (result.action !== 'update') throw new Error('expected update');
    const byField = Object.fromEntries(result.updates.map((u) => [u.field, u.value]));
    expect(byField.president).toBe('Rtr. Real President');
    expect(byField.secretary).toBe('Rtr. Real Secretary');
  });
});
