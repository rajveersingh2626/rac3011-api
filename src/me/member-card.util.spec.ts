import { describe, expect, it } from 'vitest';
import { buildCardId } from './member-card.util';

describe('buildCardId', () => {
  it('builds a district-club-digits id from the club short name', () => {
    const id = buildCardId('mp_abc123', 'Delhi South East', 'Rotaract Club of Delhi South East');
    expect(id).toMatch(/^3011-D[A-Z]{0,3}-\d{4}$/);
  });

  it('is stable for the same member id', () => {
    const a = buildCardId('mp_stable', 'Delhi South East', 'Rotaract Club of Delhi South East');
    const b = buildCardId('mp_stable', 'Delhi South East', 'Rotaract Club of Delhi South East');
    expect(a).toBe(b);
  });

  it('falls back to the club name when there is no short name', () => {
    const id = buildCardId('mp_xyz', null, 'District Officers');
    expect(id.startsWith('3011-DO-')).toBe(true);
  });
});
