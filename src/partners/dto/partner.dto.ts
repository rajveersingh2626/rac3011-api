import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPartnerSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    logoUrl: z.string().url().max(1024).nullable().optional(),
    tier: z.string().trim().min(1).max(80),
    website: z.string().url().max(1024).nullable().optional(),
    permissionStatus: z.enum(['pending', 'granted']).optional(),
  })
  .strict();

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;

export class CreatePartnerDto extends createZodDto(createPartnerSchema) {}

export const updatePartnerSchema = createPartnerSchema.partial().strict();

export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;

export class UpdatePartnerDto extends createZodDto(updatePartnerSchema) {}
