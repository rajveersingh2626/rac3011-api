import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const linkSchema = z.string().trim().url().max(1024);

export const createCampSchema = z
  .object({
    date: dateSchema,
    venue: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(120).nullable().optional(),
    unitsCollected: z.number().int().min(0),
    donorsRegistered: z.number().int().min(0).nullable().optional(),
    partnerBloodBank: z.string().trim().min(1).max(200).nullable().optional(),
    photos: z.array(linkSchema).max(20).optional(),
    participatingClubIds: z.array(z.string().trim().min(1)).max(30).optional(),
  })
  .strict();
export type CreateCampInput = z.infer<typeof createCampSchema>;
export class CreateCampDto extends createZodDto(createCampSchema) {}
