import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const emptyToNull = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? null : val;

export const createDistrictTeamMemberSchema = z
  .object({
    memberId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable().optional()),
    name: z.string().trim().min(1).max(200),
    designation: z.string().trim().min(1).max(200),
    kind: z.enum(['core', 'dsc']),
    ryYear: z.number().int().min(2000).max(2100),
    photoUrl: z.preprocess(emptyToNull, z.string().url().max(1024).nullable().optional()),
    phone: z.preprocess(emptyToNull, z.string().trim().max(32).nullable().optional()),
    email: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
    bio: z.preprocess(emptyToNull, z.string().trim().max(4000).nullable().optional()),
    clubId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable().optional()),
  })
  .strict();

export type CreateDistrictTeamMemberInput = z.infer<typeof createDistrictTeamMemberSchema>;

export class CreateDistrictTeamMemberDto extends createZodDto(createDistrictTeamMemberSchema) {}

export const updateDistrictTeamMemberSchema = createDistrictTeamMemberSchema.partial().strict();

export type UpdateDistrictTeamMemberInput = z.infer<typeof updateDistrictTeamMemberSchema>;

export class UpdateDistrictTeamMemberDto extends createZodDto(updateDistrictTeamMemberSchema) {}
