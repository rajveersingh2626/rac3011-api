import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createBeneficiarySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    age: z.number().int().min(0).max(130).nullable().optional(),
    gender: z.string().trim().min(1).max(30).nullable().optional(),
    phone: z.string().trim().min(4).max(20).nullable().optional(),
    eye: z.enum(['left', 'right', 'both']),
    screenedOn: dateSchema,
    campLocation: z.string().trim().min(1).max(200).nullable().optional(),
    notes: z.string().trim().max(3000).nullable().optional(),
    clubId: z.string().trim().min(1).optional(),
  })
  .strict();
export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;
export class CreateBeneficiaryDto extends createZodDto(createBeneficiarySchema) {}
