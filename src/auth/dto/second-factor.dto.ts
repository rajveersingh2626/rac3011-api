import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const verifySecondFactorSchema = z.object({
  method: z.enum(['totp', 'email']),
  code: z.string().trim().min(4).max(16),
  rememberDevice: z.boolean().optional(),
});

export type VerifySecondFactorInput = z.infer<typeof verifySecondFactorSchema>;

export class VerifySecondFactorDto extends createZodDto(verifySecondFactorSchema) {}
