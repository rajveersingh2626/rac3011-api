import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const scopeType = z.enum(['none', 'club', 'zone', 'project']);

export const createRoleSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, 'key must be lower_snake_case'),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  scopeType,
  permissionKeys: z.array(z.string().min(1)),
});

export const updateRoleSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    scopeType: scopeType.optional(),
    permissionKeys: z.array(z.string().min(1)).optional(),
  })
  .strict();

export class CreateRoleDto extends createZodDto(createRoleSchema) {}
export class UpdateRoleDto extends createZodDto(updateRoleSchema) {}

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
