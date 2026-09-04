import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const reportRequestAudienceSchema = z
  .object({
    all: z.boolean().optional(),
    clubIds: z.array(z.string().trim().min(1)).optional(),
    zoneIds: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

export const createReportRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  questions: z.array(z.string().trim().min(1).max(500)).min(1).max(30),
  audience: reportRequestAudienceSchema,
  dueAt: z.string().datetime(),
});
export type CreateReportRequestInput = z.infer<typeof createReportRequestSchema>;
export class CreateReportRequestDto extends createZodDto(createReportRequestSchema) {}

export const updateReportRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    questions: z.array(z.string().trim().min(1).max(500)).min(1).max(30).optional(),
    audience: reportRequestAudienceSchema.optional(),
    dueAt: z.string().datetime().optional(),
  })
  .strict();
export type UpdateReportRequestInput = z.infer<typeof updateReportRequestSchema>;
export class UpdateReportRequestDto extends createZodDto(updateReportRequestSchema) {}

export const putReportRequestResponseSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});
export type PutReportRequestResponseInput = z.infer<typeof putReportRequestResponseSchema>;
export class PutReportRequestResponseDto extends createZodDto(putReportRequestResponseSchema) {}
