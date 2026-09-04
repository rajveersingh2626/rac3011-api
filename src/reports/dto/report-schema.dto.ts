import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'select',
  'multiselect',
  'link',
  'date',
  'boolean',
  'clubs',
]);

export const reportFieldInputSchema = z.object({
  section: z.string().trim().min(1).max(120),
  fieldKey: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/, 'fieldKey must be snake_case'),
  label: z.string().trim().min(1).max(200),
  type: fieldTypeSchema,
  options: z.unknown().optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0),
  helpText: z.string().trim().max(500).nullable().optional(),
  perActivity: z.boolean().optional(),
  pointSourceKey: z.string().trim().max(120).nullable().optional(),
});

export const updateReportSchemaSchema = z
  .object({
    fields: z.array(reportFieldInputSchema).max(60).optional(),
    status: z.literal('active').optional(),
  })
  .strict()
  .refine((v) => v.fields !== undefined || v.status !== undefined, {
    message: 'Provide fields and/or status',
  });

export type ReportFieldInputDto = z.infer<typeof reportFieldInputSchema>;
export type UpdateReportSchemaInput = z.infer<typeof updateReportSchemaSchema>;
export class UpdateReportSchemaDto extends createZodDto(updateReportSchemaSchema) {}
