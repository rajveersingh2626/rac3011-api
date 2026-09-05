import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createSisterClubRequestSchema = z
  .object({
    clubId: z.string().trim().min(1),
    partnerClubName: z.string().trim().min(1).max(200),
    partnerDistrict: z.string().trim().min(1).max(120),
    country: z.string().trim().min(1).max(120),
    contactName: z.string().trim().min(1).max(200),
    contactEmail: z.string().trim().email(),
  })
  .strict();

export type CreateSisterClubRequestInput = z.infer<typeof createSisterClubRequestSchema>;

export class CreateSisterClubRequestDto extends createZodDto(createSisterClubRequestSchema) {}

export const updateSisterClubRequestSchema = z
  .object({
    status: z.enum(['submitted', 'in_progress', 'signed', 'declined']).optional(),
    signedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
      .nullable()
      .optional(),
  })
  .strict()
  .refine((v) => v.status !== undefined || v.signedOn !== undefined, {
    message: 'At least one of status, signedOn is required',
  });

export type UpdateSisterClubRequestInput = z.infer<typeof updateSisterClubRequestSchema>;

export class UpdateSisterClubRequestDto extends createZodDto(updateSisterClubRequestSchema) {}
