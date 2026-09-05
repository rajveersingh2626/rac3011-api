import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CATEGORIES = ['documents', 'forms', 'logos', 'photos', 'guest_kit', 'templates'] as const;

export const createResourceSchema = z
  .object({
    category: z.enum(CATEGORIES),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(2000).nullable().optional(),
    url: z.string().url().max(1024),
    isLocked: z.boolean().optional(),
    requiredPermission: z.string().trim().max(120).nullable().optional(),
    comingSoonMonth: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export class CreateResourceDto extends createZodDto(createResourceSchema) {}

export const updateResourceSchema = createResourceSchema.partial().strict();

export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export class UpdateResourceDto extends createZodDto(updateResourceSchema) {}
