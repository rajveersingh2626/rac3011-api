import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateFeedbackSchema = z
  .object({
    status: z.enum(['open', 'reviewed', 'closed']).optional(),
    reply: z.string().trim().min(1).max(3000).optional(),
  })
  .strict()
  .refine((v) => v.status !== undefined || v.reply !== undefined, {
    message: 'Provide at least one field',
  });
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
export class UpdateFeedbackDto extends createZodDto(updateFeedbackSchema) {}
