import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const dispatchTicketsSchema = z
  .object({
    audience: z.enum(['all_members', 'presidents', 'secretaries', 'dac_members', 'custom_emails']),
    customEmails: z.array(z.string().email().trim().toLowerCase()).optional(),
  })
  .strict();

export type DispatchTicketsInput = z.infer<typeof dispatchTicketsSchema>;
export class DispatchTicketsDto extends createZodDto(dispatchTicketsSchema) {}
