import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const previewImportSchema = z.object({
  clubId: z.string().trim().min(1),
  csv: z.string().trim().min(1),
});

export type PreviewImportInput = z.infer<typeof previewImportSchema>;

export class PreviewImportDto extends createZodDto(previewImportSchema) {}

const importRowSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(32).nullable().optional(),
  rotaryId: z.string().trim().max(64).nullable().optional(),
});

export const commitImportSchema = z.object({
  clubId: z.string().trim().min(1),
  status: z.literal('committed'),
  rows: z.array(importRowSchema).min(1).max(500),
});

export type CommitImportInput = z.infer<typeof commitImportSchema>;
export type ImportRowInput = z.infer<typeof importRowSchema>;

export class CommitImportDto extends createZodDto(commitImportSchema) {}
