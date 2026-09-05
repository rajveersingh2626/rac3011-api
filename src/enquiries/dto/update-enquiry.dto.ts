import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateEnquirySchema = z
  .object({
    status: z.enum(['new', 'in_progress', 'closed']).optional(),
    assignedToId: z.string().trim().min(1).nullable().optional(),
  })
  .strict()
  .refine((v) => v.status !== undefined || v.assignedToId !== undefined, {
    message: 'At least one of status, assignedToId is required',
  });

export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;

export class UpdateEnquiryDto extends createZodDto(updateEnquirySchema) {}
