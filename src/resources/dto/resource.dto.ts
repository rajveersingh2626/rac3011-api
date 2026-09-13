import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CATEGORIES = ['documents', 'forms', 'logos', 'photos', 'guest_kit', 'templates'] as const;

const emptyToNull = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? null : val;

export const createResourceSchema = z
  .object({
    category: z.enum(CATEGORIES),
    title: z.string().trim().min(1).max(300),
    description: z.preprocess(emptyToNull, z.string().trim().max(2000).nullable().optional()),
    url: z.string().trim().max(1024),
    isLocked: z.boolean().optional(),
    requiredPermission: z.preprocess(emptyToNull, z.string().trim().max(120).nullable().optional()),
    comingSoonMonth: z.preprocess(emptyToNull, z.string().trim().max(40).nullable().optional()),
  });

export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export class CreateResourceDto extends createZodDto(createResourceSchema) {}

export const updateResourceSchema = createResourceSchema.partial();

export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export class UpdateResourceDto extends createZodDto(updateResourceSchema) {}
