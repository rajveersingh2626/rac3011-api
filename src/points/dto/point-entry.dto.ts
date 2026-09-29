import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updatePointEntrySchema = z
  .object({
    points: z.number(),
    reason: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export type UpdatePointEntryInput = z.infer<typeof updatePointEntrySchema>;
export class UpdatePointEntryDto extends createZodDto(updatePointEntrySchema) {}

export const createPointEntrySchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
    categoryId: z.string().min(1, 'categoryId is required'),
    label: z.string().trim().min(2, 'label must be at least 2 characters').max(200),
    points: z.number(),
    reason: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export type CreatePointEntryInput = z.infer<typeof createPointEntrySchema>;
export class CreatePointEntryDto extends createZodDto(createPointEntrySchema) {}
