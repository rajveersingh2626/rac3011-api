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

export const resetReportSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
  clearValues: z.boolean().optional(),
});
export type ResetReportInput = z.infer<typeof resetReportSchema>;
export class ResetReportDto extends createZodDto(resetReportSchema) {}

export const reviewFlagInputSchema = z.object({
  targetType: z.enum(['field', 'activity', 'general']),
  fieldKey: z.string().trim().optional(),
  activityIndex: z.number().int().min(0).optional(),
  activityFieldKey: z.string().trim().optional(),
  section: z.string().trim().optional(),
  comment: z.string().trim().min(1).max(2000),
});

export const createReportFlagsSchema = z.object({
  flags: z.array(reviewFlagInputSchema).min(1),
  reason: z.string().trim().max(1000).optional(),
});
export type CreateReportFlagsInput = z.infer<typeof createReportFlagsSchema>;
export class CreateReportFlagsDto extends createZodDto(createReportFlagsSchema) {}

export const resolveReportFlagSchema = z.object({
  reply: z.string().trim().max(2000).optional(),
});
export type ResolveReportFlagInput = z.infer<typeof resolveReportFlagSchema>;
export class ResolveReportFlagDto extends createZodDto(resolveReportFlagSchema) {}
