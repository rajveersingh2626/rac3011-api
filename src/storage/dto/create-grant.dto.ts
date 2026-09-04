import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createGrantSchema = z.object({
  tier: z.enum(['permanent', 'dynamic', 'private']),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive(),
  resourceType: z.string().min(1).max(64),
  resourceId: z.string().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(255).optional(),
});

export type CreateGrantInput = z.infer<typeof createGrantSchema>;

export class CreateGrantDto extends createZodDto(createGrantSchema) {}

export const finaliseGrantSchema = z.object({ providerKey: z.string().min(1).max(1024) });

export type FinaliseGrantInput = z.infer<typeof finaliseGrantSchema>;

export class FinaliseGrantDto extends createZodDto(finaliseGrantSchema) {}
