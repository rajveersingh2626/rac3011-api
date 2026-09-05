import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createFixtureSchema = z
  .object({
    homeTeamId: z.string().trim().min(1),
    awayTeamId: z.string().trim().min(1),
    scheduledAt: z.string().datetime(),
    venue: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .strict()
  .refine((v) => v.homeTeamId !== v.awayTeamId, {
    message: 'homeTeamId and awayTeamId must differ',
    path: ['awayTeamId'],
  });
export type CreateFixtureInput = z.infer<typeof createFixtureSchema>;
export class CreateFixtureDto extends createZodDto(createFixtureSchema) {}
