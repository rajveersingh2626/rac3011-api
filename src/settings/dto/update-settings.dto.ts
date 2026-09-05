import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateSettingsSchema = z
  .record(z.string(), z.unknown())
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one setting must be provided' });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export class UpdateSettingsDto extends createZodDto(updateSettingsSchema) {}
