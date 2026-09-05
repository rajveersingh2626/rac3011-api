import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ruleTypeSchema = z.enum(['flat', 'per_unit', 'tiered', 'penalty']);
const periodSchema = z.enum(['monthly', 'yearly', 'once']);
const sourceTypeSchema = z.enum([
  'report_field',
  'club_fact',
  'event_attendance',
  'project_collaboration',
  'ride_hosting',
  'club_events',
]);

export const tierSchema = z
  .object({
    min: z.number(),
    max: z.number().nullable(),
    points: z.number(),
  })
  .strict();

export const createPointRuleSchema = z
  .object({
    categoryId: z.string().trim().min(1),
    key: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(200),
    ruleType: ruleTypeSchema,
    period: periodSchema,
    sourceType: sourceTypeSchema,
    sourceKey: z.string().trim().min(1).max(120),
    numeratorKey: z.string().trim().min(1).max(120).nullable().optional(),
    denominatorKey: z.string().trim().min(1).max(120).nullable().optional(),
    points: z.number().nullable().optional(),
    perUnitCap: z.number().int().positive().nullable().optional(),
    ryYear: z.number().int().min(2000).max(2100),
    tiers: z.array(tierSchema).max(20).optional(),
  })
  .strict();
export type CreatePointRuleInput = z.infer<typeof createPointRuleSchema>;
export class CreatePointRuleDto extends createZodDto(createPointRuleSchema) {}

export const updatePointRuleSchema = z
  .object({
    categoryId: z.string().trim().min(1),
    label: z.string().trim().min(1).max(200),
    ruleType: ruleTypeSchema,
    period: periodSchema,
    sourceType: sourceTypeSchema,
    sourceKey: z.string().trim().min(1).max(120),
    numeratorKey: z.string().trim().min(1).max(120).nullable(),
    denominatorKey: z.string().trim().min(1).max(120).nullable(),
    points: z.number().nullable(),
    perUnitCap: z.number().int().positive().nullable(),
    tiers: z.array(tierSchema).max(20),
    isActive: z.boolean(),
  })
  .partial()
  .strict();
export type UpdatePointRuleInput = z.infer<typeof updatePointRuleSchema>;
export class UpdatePointRuleDto extends createZodDto(updatePointRuleSchema) {}
