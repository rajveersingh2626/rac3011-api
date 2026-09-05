import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPublicationSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    type: z.enum(['directory', 'newsletter']),
    url: z.string().url().max(1024),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM'),
    coverUrl: z.string().url().max(1024).nullable().optional(),
  })
  .strict();

export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;

export class CreatePublicationDto extends createZodDto(createPublicationSchema) {}

export const updatePublicationSchema = createPublicationSchema.partial().strict();

export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>;

export class UpdatePublicationDto extends createZodDto(updatePublicationSchema) {}
