import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateMemberSchema = z.object({
  status: z.enum(['approved', 'suspended']),
  rejectionReason: z.string().trim().min(1).max(500).nullable().optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export class UpdateMemberDto extends createZodDto(updateMemberSchema) {}
