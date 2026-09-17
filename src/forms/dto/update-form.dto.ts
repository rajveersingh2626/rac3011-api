import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { formFieldDefinitionSchema } from '../forms.types';

export const updateFormSchema = z
  .object({
    slug: z.string().trim().min(2).max(100).optional(),
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    category: z.string().trim().max(100).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    accessMode: z.enum(['all', 'specific', 'none']).optional(),
    targetSurface: z.string().trim().max(100).optional(),
    targetRoles: z.array(z.string()).optional(),
    targetClubIds: z.array(z.string()).optional(),
    fields: z.array(formFieldDefinitionSchema).min(1).optional(),
    isPublic: z.boolean().optional(),
  })
  .strict();

export type UpdateFormInput = z.infer<typeof updateFormSchema>;
export class UpdateFormDto extends createZodDto(updateFormSchema) {}
