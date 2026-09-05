import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const registerMemberSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  clubId: z.string().trim().min(1),
  phone: z.string().trim().max(32).optional(),
  rotaryId: z.string().trim().max(64).optional(),
});

export type RegisterMemberInput = z.infer<typeof registerMemberSchema>;

export class RegisterMemberDto extends createZodDto(registerMemberSchema) {}
