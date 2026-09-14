import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createClubSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    name: z.string().trim().min(1).max(200),
    shortName: z.string().trim().max(80).nullable().optional(),
    slug: z.string().trim().max(120).nullable().optional(),
    zone: z.string().trim().max(100).nullable().optional(),
    zoneId: z.string().trim().max(100).nullable().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    president: z.string().trim().max(200).nullable().optional(),
    isDirector: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(32).nullable().optional(),
    email: z.string().email().nullable().optional().or(z.literal('')),
    rotaryId: z.string().trim().max(64).nullable().optional(),
    secretary: z.string().trim().max(200).nullable().optional(),
    secretaryEmail: z.string().email().nullable().optional().or(z.literal('')),
    secretaryPhone: z.string().trim().max(32).nullable().optional(),
    charterDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
      .nullable()
      .optional(),
    isActive: z.boolean().optional().default(true),
    meetingInfo: z.string().trim().max(2000).nullable().optional(),
    socialLinks: z.record(z.string(), z.string()).nullable().optional(),
    logoUrl: z.string().url().max(1024).nullable().optional().or(z.literal('')),
    memberCount: z.number().int().min(0).optional().default(0),
  })
  .strict();

export type CreateClubInput = z.infer<typeof createClubSchema>;

export class CreateClubDto extends createZodDto(createClubSchema) {}
