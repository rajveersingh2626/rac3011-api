import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const playerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  memberId: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).max(50).optional(),
});

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    captainName: z.string().trim().min(1).max(200).optional(),
    captainPhone: z.string().trim().min(4).max(20).optional(),
    status: z.enum(['registered', 'confirmed', 'withdrawn']).optional(),
    players: z.array(playerSchema).max(15).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export class UpdateTeamDto extends createZodDto(updateTeamSchema) {}
