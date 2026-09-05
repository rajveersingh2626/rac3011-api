import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPastDrrSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9-]+$/, 'Expected a lowercase, hyphenated slug'),
    terms: z.array(z.string().trim().min(1)).min(1),
    homeClubId: z.string().trim().min(1).nullable().optional(),
    photoUrl: z.string().url().max(1024).nullable().optional(),
    bio: z.string().trim().max(4000).nullable().optional(),
    isLowResPhoto: z.boolean().optional(),
  })
  .strict();

export type CreatePastDrrInput = z.infer<typeof createPastDrrSchema>;

export class CreatePastDrrDto extends createZodDto(createPastDrrSchema) {}

export const updatePastDrrSchema = createPastDrrSchema.partial().strict();

export type UpdatePastDrrInput = z.infer<typeof updatePastDrrSchema>;

export class UpdatePastDrrDto extends createZodDto(updatePastDrrSchema) {}
