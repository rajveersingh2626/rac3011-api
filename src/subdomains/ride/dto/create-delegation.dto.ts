import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createDelegationSchema = z
  .object({
    ryYear: z.number().int().min(2020).max(2100),
    visitingDistrict: z.string().trim().min(1).max(50),
    country: z.string().trim().min(1).max(100),
    startsAt: dateSchema,
    endsAt: dateSchema,
    headcount: z.number().int().min(1).max(500),
    contactName: z.string().trim().min(1).max(200),
    contactEmail: z.string().trim().email().max(200).nullable().optional(),
    status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']).default('planned'),
  })
  .strict()
  .refine((v) => v.startsAt <= v.endsAt, {
    message: 'endsAt must be on or after startsAt',
    path: ['endsAt'],
  });
export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
export class CreateDelegationDto extends createZodDto(createDelegationSchema) {}
