import { describe, expect, it } from 'vitest';
import { parseAreasOfFocus, parseStatTiles } from './home-content-parser';

const SAMPLE_MD = `# Rotaract District Organization 3011 — Home / Site Content Extract

## Homepage Stat Tiles
| Label | Value | Suffix | Change/Note | Color |
|---|---|---|---|---|
| Lives Impacted | 55,000+ | Lives | +22% this year | #D81B60 |
| Active Clubs | 75 Clubs | Clubs | RY 2026-27 Roster | #123499 |

## Areas of Focus (Rotary International 7 areas, District framing)
1. **Peacebuilding and conflict prevention** — Training youth leaders and creating safe spaces.
2. **Disease prevention and treatment** — Free medical camps and blood donation drives.

## Leadership Cards (generic role placeholders shown on homepage)
| ID | Name | Role |
|---|---|---|
`;

describe('parseStatTiles', () => {
  it('extracts each stat tile row', () => {
    const stats = parseStatTiles(SAMPLE_MD);
    expect(stats).toEqual([
      {
        label: 'Lives Impacted',
        value: '55,000+',
        suffix: 'Lives',
        note: '+22% this year',
        color: '#D81B60',
      },
      {
        label: 'Active Clubs',
        value: '75 Clubs',
        suffix: 'Clubs',
        note: 'RY 2026-27 Roster',
        color: '#123499',
      },
    ]);
  });
});

describe('parseAreasOfFocus', () => {
  it('extracts title and description for each numbered area', () => {
    const areas = parseAreasOfFocus(SAMPLE_MD);
    expect(areas).toEqual([
      {
        order: 0,
        title: 'Peacebuilding and conflict prevention',
        description: 'Training youth leaders and creating safe spaces.',
      },
      {
        order: 1,
        title: 'Disease prevention and treatment',
        description: 'Free medical camps and blood donation drives.',
      },
    ]);
  });
});
