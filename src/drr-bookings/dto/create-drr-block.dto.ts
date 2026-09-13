import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createDrrBlockSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
    startsAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    endsAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((data) => Boolean(data.date || (data.startsAt && data.endsAt)), {
    message: 'Either date or startsAt and endsAt must be provided',
  });

export type CreateDrrBlockInput = z.infer<typeof createDrrBlockSchema>;
export class CreateDrrBlockDto extends createZodDto(createDrrBlockSchema) {}
