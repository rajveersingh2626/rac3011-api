import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createDrrBlockSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    endsAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type CreateDrrBlockInput = z.infer<typeof createDrrBlockSchema>;
export class CreateDrrBlockDto extends createZodDto(createDrrBlockSchema) {}
