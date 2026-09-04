import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createEnquirySchema = z
  .object({
    kind: z.enum(['new_club', 'sponsor', 'contact']),
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email(),
    phone: z.string().trim().max(32).optional(),
    organisation: z.string().trim().max(200).optional(),
    message: z.string().trim().min(1).max(4000),
    payload: z.record(z.string(), z.unknown()).optional(),
    // Honeypot: real users never fill this hidden field; bots that autofill every input do.
    website: z.string().max(200).optional(),
  })
  .strict();

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

export class CreateEnquiryDto extends createZodDto(createEnquirySchema) {}
