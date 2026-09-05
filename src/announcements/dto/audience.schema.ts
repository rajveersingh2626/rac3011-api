import { z } from 'zod';

export const audienceSchema = z
  .object({
    roleKeys: z.array(z.string().trim().min(1)).optional(),
    zoneIds: z.array(z.string().trim().min(1)).optional(),
    clubIds: z.array(z.string().trim().min(1)).optional(),
    memberIds: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();
