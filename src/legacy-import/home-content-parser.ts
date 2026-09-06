import type { AreaOfFocus, StatTile } from './legacy-import.types';

function tableRows(markdown: string, heading: string): string[][] {
  const start = markdown.indexOf(heading);
  if (start === -1) return [];
  const section = markdown.slice(start + heading.length);
  const nextHeading = section.indexOf('\n## ');
  const body = nextHeading === -1 ? section : section.slice(0, nextHeading);
  return body
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .slice(2) // drop header row + separator row
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

export function parseStatTiles(markdown: string): StatTile[] {
  return tableRows(markdown, '## Homepage Stat Tiles').map(
    ([label, value, suffix, note, color]) => ({
      label,
      value,
      suffix,
      note,
      color,
    }),
  );
}

export function parseAreasOfFocus(markdown: string): AreaOfFocus[] {
  const heading = '## Areas of Focus';
  const start = markdown.indexOf(heading);
  if (start === -1) return [];
  const section = markdown.slice(start + heading.length);
  const nextHeading = section.indexOf('\n## ');
  const body = nextHeading === -1 ? section : section.slice(0, nextHeading);
  const lines = body.split('\n').filter((line) => /^\d+\.\s+\*\*/.test(line.trim()));
  return lines.map((line, i) => {
    const trimmed = line.trim();
    const match = /^\d+\.\s+\*\*(.+?)\*\*\s+—\s+(.+)$/.exec(trimmed);
    if (!match) throw new Error(`could not parse area-of-focus line: ${trimmed}`);
    return { order: i, title: match[1], description: match[2] };
  });
}
