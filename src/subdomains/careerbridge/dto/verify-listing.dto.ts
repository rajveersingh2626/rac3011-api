import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const verifyListingSchema = z
  .object({
    token: z.string().trim().min(1),
  })
  .strict();
export type VerifyListingInput = z.infer<typeof verifyListingSchema>;
export class VerifyListingDto extends createZodDto(verifyListingSchema) {}
