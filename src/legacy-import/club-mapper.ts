import type { ExistingClubRow, ScrapedClub } from './legacy-import.types';

// Mirrors prisma/seed/zones.ts's slugify so generated club ids match the existing convention.
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PLACEHOLDER_PRESIDENT = 'rtr. club president';
const PLACEHOLDER_SECRETARY = 'rtr. club secretary';

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

export function isPlaceholderPresident(club: ScrapedClub): boolean {
  return (club.president ?? '').trim().toLowerCase() === PLACEHOLDER_PRESIDENT;
}

export function isPlaceholderSecretary(club: ScrapedClub): boolean {
  return (club.secretary ?? '').trim().toLowerCase() === PLACEHOLDER_SECRETARY;
}

// Dry-run summary count only; mergeClubFields gates each role independently instead.
export function isPlaceholderClub(club: ScrapedClub): boolean {
  return isPlaceholderPresident(club) && isPlaceholderSecretary(club);
}

export type ClubFieldUpdate = {
  field: keyof ExistingClubRow;
  value: string | number;
};

export type ClubMergeResult =
  | { action: 'create'; id: string; data: Record<string, unknown>; notes: string[] }
  | { action: 'update'; id: string; updates: ClubFieldUpdate[]; notes: string[] }
  | { action: 'noop'; id: string; notes: string[] };

const OFFICER_FIELDS = [
  'president',
  'phone',
  'email',
  'secretary',
  'secretaryEmail',
  'secretaryPhone',
] as const;

const SCRAPED_TO_EXISTING_KEY: Record<(typeof OFFICER_FIELDS)[number], keyof ScrapedClub> = {
  president: 'president',
  phone: 'phone',
  email: 'email',
  secretary: 'secretary',
  secretaryEmail: 'secretary_email',
  secretaryPhone: 'secretary_phone',
};

const OFFICER_FIELD_ROLE: Record<(typeof OFFICER_FIELDS)[number], 'president' | 'secretary'> = {
  president: 'president',
  phone: 'president',
  email: 'president',
  secretary: 'secretary',
  secretaryEmail: 'secretary',
  secretaryPhone: 'secretary',
};

function isPlaceholderField(field: (typeof OFFICER_FIELDS)[number], scraped: ScrapedClub): boolean {
  return OFFICER_FIELD_ROLE[field] === 'president'
    ? isPlaceholderPresident(scraped)
    : isPlaceholderSecretary(scraped);
}

// Fills only empty existing fields with non-placeholder scraped values, one officer role at a
// time — a club can have a real president and a placeholder secretary or vice versa.
export function mergeClubFields(
  existing: ExistingClubRow | null,
  scraped: ScrapedClub,
): ClubMergeResult {
  const id = slugify(scraped.name).toUpperCase();
  const notes: string[] = [];
  if (isPlaceholderPresident(scraped)) notes.push('placeholder president in source; skipped');
  if (isPlaceholderSecretary(scraped)) notes.push('placeholder secretary in source; skipped');

  if (!existing) {
    const data: Record<string, unknown> = {
      id,
      name: scraped.name,
      shortName: scraped.short_name,
      zone: scraped.zone,
      lat: scraped.lat,
      lng: scraped.lng,
      rotaryId: scraped.rotary_id,
    };
    for (const field of OFFICER_FIELDS) {
      if (isPlaceholderField(field, scraped)) continue;
      const raw = scraped[SCRAPED_TO_EXISTING_KEY[field]];
      if (!isBlank(raw as string | null)) data[field] = raw;
    }
    return {
      action: 'create',
      id,
      data,
      notes: [...notes, 'club not found in target DB; created'],
    };
  }

  const updates: ClubFieldUpdate[] = [];

  const metaCandidates: { field: keyof ExistingClubRow; value: string | number | null }[] = [
    { field: 'zone', value: scraped.zone },
    { field: 'lat', value: scraped.lat },
    { field: 'rotaryId', value: scraped.rotary_id },
  ];
  for (const c of metaCandidates) {
    const existingValue = existing[c.field];
    if ((existingValue == null || existingValue === '') && c.value != null && c.value !== '') {
      updates.push({ field: c.field, value: c.value });
    }
  }
  if (existing.lng == null && scraped.lng != null)
    updates.push({ field: 'lng', value: scraped.lng });

  for (const field of OFFICER_FIELDS) {
    if (isPlaceholderField(field, scraped)) continue;
    const existingValue = existing[field];
    const scrapedValue = scraped[SCRAPED_TO_EXISTING_KEY[field]] as string | null;
    if (isBlank(existingValue) && !isBlank(scrapedValue)) {
      updates.push({ field, value: scrapedValue as string });
    }
  }

  if (updates.length === 0) {
    return { action: 'noop', id: existing.id, notes: [...notes, 'no empty fields to fill'] };
  }
  return { action: 'update', id: existing.id, updates, notes };
}
