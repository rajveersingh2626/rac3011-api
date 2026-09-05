import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const playerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  memberId: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).max(50).optional(),
});

export const createTeamSchema = z
  .object({
    clubId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(200),
    captainName: z.string().trim().min(1).max(200),
    captainPhone: z.string().trim().min(4).max(20),
    season: z.number().int().min(2000).max(2100).optional(),
    players: z.array(playerSchema).max(15).default([]),
  })
  .strict();
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export class CreateTeamDto extends createZodDto(createTeamSchema) {}
