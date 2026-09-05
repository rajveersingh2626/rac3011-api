import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Decimal overs must be one decimal place, 0-5 balls (cricket overs notation, e.g. 4.3 not 4.7).
function isValidOvers(v: number): boolean {
  const rounded = Math.round(v * 10) / 10;
  if (Math.abs(rounded - v) > 1e-9) return false;
  const tenths = Math.round((rounded - Math.trunc(rounded)) * 10);
  return tenths >= 0 && tenths <= 5;
}

const oversSchema = z
  .number()
  .min(0)
  .max(60)
  .refine(isValidOvers, { message: 'Overs must be decimal-overs (one decimal place, 0-5 balls)' });

const resultSchema = z.object({
  homeRuns: z.number().int().min(0),
  homeWickets: z.number().int().min(0).max(10),
  homeOvers: oversSchema,
  awayRuns: z.number().int().min(0),
  awayWickets: z.number().int().min(0).max(10),
  awayOvers: oversSchema,
  winnerTeamId: z.string().trim().min(1).nullable(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const putFixtureSchema = z
  .object({
    scheduledAt: z.string().datetime().optional(),
    venue: z.string().trim().min(1).max(200).nullable().optional(),
    status: z.enum(['scheduled', 'completed', 'abandoned']).optional(),
    result: resultSchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });
export type PutFixtureInput = z.infer<typeof putFixtureSchema>;
export class PutFixtureDto extends createZodDto(putFixtureSchema) {}
