import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { formFieldDefinitionSchema } from '../forms.types';

export const createFormSchema = z
  .object({
    slug: z.string().trim().min(2).max(100),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(1000).optional(),
    category: z.string().trim().max(100).default('General'),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    accessMode: z.enum(['all', 'specific', 'none']).default('all'),
    targetSurface: z.string().trim().max(100).default('dashboard'),
    targetRoles: z.array(z.string()).default([]),
    targetClubIds: z.array(z.string()).default([]),
    fields: z.array(formFieldDefinitionSchema).min(1),
    isPublic: z.boolean().default(false),
  })
  .strict();

export type CreateFormInput = z.infer<typeof createFormSchema>;
export class CreateFormDto extends createZodDto(createFormSchema) {}
