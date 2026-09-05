import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const updateDelegationSchema = z
  .object({
    visitingDistrict: z.string().trim().min(1).max(50).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    startsAt: dateSchema.optional(),
    endsAt: dateSchema.optional(),
    headcount: z.number().int().min(1).max(500).optional(),
    contactName: z.string().trim().min(1).max(200).optional(),
    contactEmail: z.string().trim().email().max(200).nullable().optional(),
    status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' })
  .refine((v) => !(v.startsAt && v.endsAt) || v.startsAt <= v.endsAt, {
    message: 'endsAt must be on or after startsAt',
    path: ['endsAt'],
  });
export type UpdateDelegationInput = z.infer<typeof updateDelegationSchema>;
export class UpdateDelegationDto extends createZodDto(updateDelegationSchema) {}
