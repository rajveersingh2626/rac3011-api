import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateClubSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    shortName: z.string().trim().max(80).nullable(),
    slug: z.string().trim().max(120).nullable(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    phone: z.string().trim().max(32).nullable(),
    email: z.string().email().nullable(),
    rotaryId: z.string().trim().max(64).nullable(),
    secretary: z.string().trim().max(200).nullable(),
    secretaryEmail: z.string().email().nullable(),
    secretaryPhone: z.string().trim().max(32).nullable(),
    charterDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
      .nullable(),
    isActive: z.boolean(),
    meetingInfo: z.string().trim().max(2000).nullable(),
    socialLinks: z.record(z.string(), z.string()).nullable(),
    logoUrl: z.string().url().max(1024).nullable(),
  })
  .partial()
  .strict();

export type UpdateClubInput = z.infer<typeof updateClubSchema>;

export class UpdateClubDto extends createZodDto(updateClubSchema) {}
