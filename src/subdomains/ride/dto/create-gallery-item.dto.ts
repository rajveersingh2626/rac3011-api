import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createGalleryItemSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    url: z.string().trim().url().max(1024),
    kind: z.enum(['photo', 'video']),
    caption: z.string().trim().max(300).nullable().optional(),
    order: z.number().int().min(0).max(10000).default(0),
  })
  .strict();
export type CreateGalleryItemInput = z.infer<typeof createGalleryItemSchema>;
export class CreateGalleryItemDto extends createZodDto(createGalleryItemSchema) {}
