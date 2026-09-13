import { describe, it, expect } from 'vitest';
import {
  createDistrictTeamMemberSchema,
  updateDistrictTeamMemberSchema,
} from './dto/district-team-member.dto';

describe('district team member schemas', () => {
  it('validates a complete creation payload', () => {
    const input = {
      name: 'Rtr. Jane Doe',
      designation: 'District Secretary',
      kind: 'core',
      ryYear: 2026,
      phone: '9876543210',
      email: 'jane@example.com',
      bio: 'Bio text',
      photoUrl: '/leadership/jane.webp',
      clubId: null,
    };
    const parsed = createDistrictTeamMemberSchema.parse(input);
    expect(parsed.name).toBe('Rtr. Jane Doe');
  });

  it('validates a minimal creation payload with emptyValues', () => {
    const input = {
      name: 'Rtr. Jane Doe',
      designation: 'District Secretary',
      kind: 'dsc',
      ryYear: 2026,
    };
    const parsed = createDistrictTeamMemberSchema.parse(input);
    expect(parsed.kind).toBe('dsc');
  });

  it('validates an update payload as produced by PublicContentTable', () => {
    const payloadFromClient = {
      name: 'Rtr. Jane Doe Edited',
      designation: 'District Secretary',
      kind: 'core',
      ryYear: 2026,
      photoUrl: null,
      phone: null,
      email: null,
      bio: null,
      clubId: null,
    };
    const parsed = updateDistrictTeamMemberSchema.parse(payloadFromClient);
    expect(parsed.name).toBe('Rtr. Jane Doe Edited');
  });

  it('checks what happens when fields are empty string vs null vs undefined', () => {
    const payloadWithEmptyStrings = {
      name: 'Rtr. Jane Doe',
      designation: 'District Secretary',
      kind: 'core',
      ryYear: 2026,
      photoUrl: '',
      phone: '',
      email: '',
      bio: '',
      clubId: '',
    };
    const parsed = createDistrictTeamMemberSchema.parse(payloadWithEmptyStrings);
    expect(parsed.photoUrl).toBeNull();
    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBeNull();
    expect(parsed.bio).toBeNull();
    expect(parsed.clubId).toBeNull();
  });
});
