import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateListingSchema = z
  .object({
    status: z.enum(['verified', 'rejected', 'filled', 'expired']),
    rejectionReason: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export class UpdateListingDto extends createZodDto(updateListingSchema) {}
