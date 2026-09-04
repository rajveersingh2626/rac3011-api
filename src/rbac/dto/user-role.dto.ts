import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createUserRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
  scopeType: z.enum(['none', 'club', 'zone', 'project']),
  scopeId: z.string().min(1).optional(),
});

export class CreateUserRoleDto extends createZodDto(createUserRoleSchema) {}

export type CreateUserRoleInput = z.infer<typeof createUserRoleSchema>;
