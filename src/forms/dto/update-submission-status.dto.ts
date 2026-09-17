import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateSubmissionStatusSchema = z
  .object({
    status: z.enum(['submitted', 'under_review', 'approved', 'declined']),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export type UpdateSubmissionStatusInput = z.infer<typeof updateSubmissionStatusSchema>;
export class UpdateSubmissionStatusDto extends createZodDto(updateSubmissionStatusSchema) {}
