import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const submitFormSchema = z
  .object({
    applicantName: z.string().trim().max(200).optional(),
    applicantEmail: z.string().trim().email().optional(),
    applicantPhone: z.string().trim().max(50).optional(),
    clubId: z.string().trim().optional(),
    clubName: z.string().trim().max(200).optional(),
    values: z.record(z.string(), z.any()),
  })
  .strict();

export type SubmitFormInput = z.infer<typeof submitFormSchema>;
export class SubmitFormDto extends createZodDto(submitFormSchema) {}
