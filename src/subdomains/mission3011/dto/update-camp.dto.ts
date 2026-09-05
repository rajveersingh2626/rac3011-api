import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const linkSchema = z.string().trim().url().max(1024);

export const updateCampSchema = z
  .object({
    date: dateSchema.optional(),
    venue: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(120).nullable().optional(),
    unitsCollected: z.number().int().min(0).optional(),
    donorsRegistered: z.number().int().min(0).nullable().optional(),
    partnerBloodBank: z.string().trim().min(1).max(200).nullable().optional(),
    photos: z.array(linkSchema).max(20).optional(),
    participatingClubIds: z.array(z.string().trim().min(1)).max(30).optional(),
    status: z.enum(['approved', 'rejected']).optional(),
    rejectionReason: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });
export type UpdateCampInput = z.infer<typeof updateCampSchema>;
export class UpdateCampDto extends createZodDto(updateCampSchema) {}
