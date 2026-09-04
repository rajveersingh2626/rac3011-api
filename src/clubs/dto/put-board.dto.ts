import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const boardMemberSchema = z.object({
  memberId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  position: z.string().trim().min(1).max(120),
  bloodGroup: z.string().trim().max(10).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  email: z.string().email().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

export const putBoardSchema = z.object({
  ryYear: z.number().int().min(2000).max(2100),
  members: z.array(boardMemberSchema).max(50),
});

export type PutBoardInput = z.infer<typeof putBoardSchema>;

export class PutBoardDto extends createZodDto(putBoardSchema) {}
