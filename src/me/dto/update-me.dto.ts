import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(32).nullable(),
    bio: z.string().max(2000).nullable(),
    skills: z.array(z.string().trim().min(1)).max(50),
    interests: z.array(z.string().trim().min(1)).max(50),
    photoUrl: z.string().url().max(1024).nullable(),
    rotaryId: z.string().trim().max(64).nullable(),
    membershipAnniversary: isoDate.nullable(),
    themePreference: z.enum(['light', 'dark', 'system']),
    directoryOptIn: z.boolean(),
  })
  .partial();

export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export class UpdateMeDto extends createZodDto(updateMeSchema) {}
