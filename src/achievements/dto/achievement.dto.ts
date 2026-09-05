import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createAchievementSchema = z
  .object({
    type: z.enum(['chartered_club', 'award', 'milestone']),
    title: z.string().trim().min(1).max(300),
    clubId: z.string().trim().min(1).nullable().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
    certificateUrl: z.string().url().max(1024).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;

export class CreateAchievementDto extends createZodDto(createAchievementSchema) {}

export const updateAchievementSchema = createAchievementSchema.partial().strict();

export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;

export class UpdateAchievementDto extends createZodDto(updateAchievementSchema) {}
