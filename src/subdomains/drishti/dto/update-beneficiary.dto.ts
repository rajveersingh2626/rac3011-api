import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const surgerySchema = z.object({
  hospital: z.string().trim().min(1).max(200),
  operatedOn: dateSchema,
  outcome: z.string().trim().max(1000).nullable().optional(),
  followupOn: dateSchema.nullable().optional(),
});

export const updateBeneficiarySchema = z
  .object({
    stage: z.enum(['screened', 'scheduled', 'operated', 'followup', 'closed']).optional(),
    notes: z.string().trim().max(3000).nullable().optional(),
    surgery: surgerySchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });
export type UpdateBeneficiaryInput = z.infer<typeof updateBeneficiarySchema>;
export class UpdateBeneficiaryDto extends createZodDto(updateBeneficiarySchema) {}
