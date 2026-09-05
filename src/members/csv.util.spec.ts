import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv.util';

describe('parseCsv', () => {
  it('parses headers and rows, lower-casing header names', () => {
    const rows = parseCsv('Full Name,Email,Phone\nMeera Nair,meera@example.com,+91 98765 43210');
    expect(rows).toEqual([
      { 'full name': 'Meera Nair', email: 'meera@example.com', phone: '+91 98765 43210' },
    ]);
  });

  it('handles quoted fields with embedded commas and escaped quotes', () => {
    const rows = parseCsv('fullName,bio\n"Nair, Meera","Says ""hi"" a lot"');
    expect(rows).toEqual([{ fullname: 'Nair, Meera', bio: 'Says "hi" a lot' }]);
  });

  it('skips blank lines and trims whitespace', () => {
    const rows = parseCsv('fullName,email\n\n  Aman Verma  ,  aman@example.com  \n\n');
    expect(rows).toEqual([{ fullname: 'Aman Verma', email: 'aman@example.com' }]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('   \n  \n')).toEqual([]);
  });

  it('fills missing trailing cells with empty strings', () => {
    const rows = parseCsv('fullName,email,phone\nOnly Name,only@example.com');
    expect(rows).toEqual([{ fullname: 'Only Name', email: 'only@example.com', phone: '' }]);
  });
});
