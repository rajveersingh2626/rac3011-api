import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const emptyToNull = (val: unknown) =>
  typeof val === 'string' && val.trim() === '' ? null : val;

export const createGalleryItemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  eventName: z.preprocess(emptyToNull, z.string().trim().max(300).nullable().optional()),
  category: z.string().trim().default('District Events'),
  imageUrl: z.string().trim().min(1).max(2048),
  caption: z.preprocess(emptyToNull, z.string().trim().max(2000).nullable().optional()),
  date: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date(),
  ),
  order: z.number().int().optional(),
});

export type CreateGalleryItemInput = z.infer<typeof createGalleryItemSchema>;

export class CreateGalleryItemDto extends createZodDto(createGalleryItemSchema) {}

export const updateGalleryItemSchema = createGalleryItemSchema.partial();

export type UpdateGalleryItemInput = z.infer<typeof updateGalleryItemSchema>;

export class UpdateGalleryItemDto extends createZodDto(updateGalleryItemSchema) {}

export const reorderGallerySchema = z.object({
  ids: z.array(z.string().cuid()),
});

export class ReorderGalleryDto extends createZodDto(reorderGallerySchema) {}
