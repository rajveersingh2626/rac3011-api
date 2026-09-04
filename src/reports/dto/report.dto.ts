import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM');

export const createReportSchema = z.object({
  clubId: z.string().trim().min(1),
  month: monthSchema,
});
export type CreateReportInput = z.infer<typeof createReportSchema>;
export class CreateReportDto extends createZodDto(createReportSchema) {}

export const updateReportSchema = z
  .object({
    values: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    status: z.literal('submitted').optional(),
  })
  .strict()
  .refine((v) => v.values !== undefined || v.notes !== undefined || v.status !== undefined, {
    message: 'Provide values, notes and/or status',
  });
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export class UpdateReportDto extends createZodDto(updateReportSchema) {}

export const createReportQuerySchema = z.object({
  question: z.string().trim().min(1).max(2000),
});
export type CreateReportQueryInput = z.infer<typeof createReportQuerySchema>;
export class CreateReportQueryDto extends createZodDto(createReportQuerySchema) {}

export const replyReportQuerySchema = z.object({
  reply: z.string().trim().min(1).max(2000),
});
export type ReplyReportQueryInput = z.infer<typeof replyReportQuerySchema>;
export class ReplyReportQueryDto extends createZodDto(replyReportQuerySchema) {}
