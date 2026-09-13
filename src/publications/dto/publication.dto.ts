import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const emptyToNull = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? null : val;

export const createPublicationSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    type: z.enum(['directory', 'newsletter']),
    url: z.string().trim().max(1024),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM'),
    coverUrl: z.preprocess(emptyToNull, z.string().trim().max(1024).nullable().optional()),
  })
  .strict();

export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;

export class CreatePublicationDto extends createZodDto(createPublicationSchema) {}

export const updatePublicationSchema = createPublicationSchema.partial().strict();

export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>;

export class UpdatePublicationDto extends createZodDto(updatePublicationSchema) {}
