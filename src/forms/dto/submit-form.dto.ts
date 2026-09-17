import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const submitFormSchema = z.object({
  applicantName: z.string().trim().max(200).optional().or(z.literal('')),
  applicantEmail: z.string().trim().email().optional().or(z.literal('')),
  applicantPhone: z.string().trim().max(50).optional().or(z.literal('')),
  clubId: z.string().trim().optional().or(z.literal('')),
  clubName: z.string().trim().max(200).optional().or(z.literal('')),
  values: z.record(z.string(), z.any()),
});

export type SubmitFormInput = z.infer<typeof submitFormSchema>;
export class SubmitFormDto extends createZodDto(submitFormSchema) {}

