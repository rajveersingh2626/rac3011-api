import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const dispatchRideBroadcastSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1),
  districtNumbers: z.array(z.string().trim()).optional(),
  hostClubsOnly: z.boolean().optional(),
  all: z.boolean().optional(),
  customEmails: z.array(z.string().trim().email()).optional(),
});

export type DispatchRideBroadcastInput = z.infer<typeof dispatchRideBroadcastSchema>;
export class DispatchRideBroadcastDto extends createZodDto(dispatchRideBroadcastSchema) {}
