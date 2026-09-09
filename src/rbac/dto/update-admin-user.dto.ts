import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateAdminUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  rotaryId: z.string().trim().max(64).nullable().optional(),
  clubId: z.string().min(1).optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export class UpdateAdminUserDto extends createZodDto(updateAdminUserSchema) {}
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
