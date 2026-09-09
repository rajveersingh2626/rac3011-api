import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Must be a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  clubId: z.string().min(1, 'Club is required'),
  phone: z.string().trim().max(32).optional(),
  roleKey: z.string().min(1, 'Role is required'),
});

export class CreateAdminUserDto extends createZodDto(createAdminUserSchema) {}

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
