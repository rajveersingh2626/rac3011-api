import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createListingSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    company: z.string().trim().min(1).max(200),
    type: z.enum(['job', 'internship', 'mentorship']),
    location: z.string().trim().min(1).max(200),
    mode: z.enum(['remote', 'onsite', 'hybrid']),
    stipend: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().min(20).max(5000),
    applyUrl: z.string().trim().url().max(500).nullable().optional(),
    contactEmail: z.string().trim().email(),
    postedByName: z.string().trim().min(1).max(200),
    postedByEmail: z.string().trim().email(),
    rotaryAffiliation: z.string().trim().max(200).nullable().optional(),
    // Honeypot: real visitors never see or fill this field. Any non-empty value marks the
    // submission as a bot and it is silently dropped (see decisions.md, 2026-09-05).
    website: z.string().trim().max(500).optional(),
  })
  .strict();
export type CreateListingInput = z.infer<typeof createListingSchema>;
export class CreateListingDto extends createZodDto(createListingSchema) {}
