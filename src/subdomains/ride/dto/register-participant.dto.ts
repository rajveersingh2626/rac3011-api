import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const registerParticipantSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(30),
    gender: z.string().trim().max(30).default('other'),
    participantType: z.string().trim().default('external'),
    homeDistrict: z.string().trim().max(50).default('3141'),
    homeClubName: z.string().trim().max(200).default('Rotaract Club'),
    cityState: z.string().trim().max(100).default('Delhi NCR'),
    country: z.string().trim().max(100).default('India'),
    clubDesignation: z.string().trim().max(100).optional(),
    dietaryPref: z.string().trim().max(50).default('veg'),
    allergiesNotes: z.string().trim().max(500).optional(),
    emergencyName: z.string().trim().max(200).default('Emergency Contact'),
    emergencyPhone: z.string().trim().max(30).default('+91 99999 99999'),
    emergencyRelation: z.string().trim().max(100).default('Guardian'),
    arrivalAt: z.string().datetime().nullable().optional(),
    arrivalMode: z.string().trim().max(50).optional(),
    arrivalNumber: z.string().trim().max(50).optional(),
    departureAt: z.string().datetime().nullable().optional(),
    edition: z.string().trim().default('delhi_meri_jaan_2026'),
  })
  .strict();

export type RegisterParticipantInput = z.infer<typeof registerParticipantSchema>;
export class RegisterParticipantDto extends createZodDto(registerParticipantSchema) {}

export const updateParticipantStatusSchema = z
  .object({
    status: z.string().trim(),
    hostClubId: z.string().cuid().nullable().optional(),
    hostFamilyName: z.string().trim().max(200).optional(),
    hostFamilyPhone: z.string().trim().max(30).optional(),
  })
  .strict();

export type UpdateParticipantStatusInput = z.infer<typeof updateParticipantStatusSchema>;
export class UpdateParticipantStatusDto extends createZodDto(updateParticipantStatusSchema) {}
