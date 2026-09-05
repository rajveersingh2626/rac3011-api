import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const judgedPointsSchema = z
  .object({
    judgedPoints: z.number().nullable(),
    reason: z.string().trim().min(10).max(2000).nullable().optional(),
  })
  .strict()
  .refine((v) => v.judgedPoints === null || (v.reason?.length ?? 0) >= 10, {
    message: 'reason must be at least 10 characters when setting judged points',
    path: ['reason'],
  });
export type JudgedPointsInput = z.infer<typeof judgedPointsSchema>;
export class JudgedPointsDto extends createZodDto(judgedPointsSchema) {}
