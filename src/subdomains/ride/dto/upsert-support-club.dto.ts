import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const upsertSupportClubSchema = z
  .object({
    // Only honoured for callers with the manage grant; officers always register their own club.
    clubId: z.string().trim().min(1).optional(),
    ryYear: z.number().int().min(2020).max(2100).optional(),
    capacityDelegates: z.number().int().min(1).max(200),
    homestayAvailable: z.boolean(),
    preferredMonths: z.array(z.number().int().min(1).max(12)).max(12).default([]),
    contactMemberId: z.string().trim().min(1).nullable().optional(),
    contactPhone: z.string().trim().min(5).max(30),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();
export type UpsertSupportClubInput = z.infer<typeof upsertSupportClubSchema>;
export class UpsertSupportClubDto extends createZodDto(upsertSupportClubSchema) {}
