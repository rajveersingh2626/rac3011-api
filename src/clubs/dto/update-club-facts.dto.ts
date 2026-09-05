import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .nullable();

export const updateClubFactsSchema = z
  .object({
    ryYear: z.number().int().min(2000).max(2100),
    duesPaidOn: dateOnly,
    riCitationCompleted: z.boolean(),
    paulHarrisFellows: z.number().int().min(0),
    dualMembers: z.number().int().min(0),
    mdioCommitteeMembers: z.number().int().min(0),
    mdioEventsAttended: z.number().int().min(0),
    sisterClubSignedOn: dateOnly,
    drrVisitOn: dateOnly,
    vocationalCentreOn: dateOnly,
    activeSocialHandles: z.number().int().min(0),
    clubMerchandise: z.boolean(),
    clubWebsiteUrl: z.string().url().max(1024).nullable(),
    priorYearMemberCount: z.number().int().min(0).nullable(),
  })
  .partial()
  .required({ ryYear: true })
  .strict();
export type UpdateClubFactsInput = z.infer<typeof updateClubFactsSchema>;
export class UpdateClubFactsDto extends createZodDto(updateClubFactsSchema) {}
