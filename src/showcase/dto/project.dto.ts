import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const photoUrlSchema = z.string().trim().url().max(1024);

export const createProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(100),
    date: dateSchema,
    summary: z.string().trim().min(1).max(3000),
    body: z.string().trim().max(20000).nullable().optional(),
    beneficiaries: z.number().int().min(0).nullable().optional(),
    photos: z.array(photoUrlSchema).max(20).optional(),
    collaboratingClubIds: z.array(z.string().trim().min(1)).max(20).optional(),
    consentConfirmed: z.boolean().optional(),
  })
  .strict();
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export class CreateProjectDto extends createZodDto(createProjectSchema) {}

export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    date: dateSchema.optional(),
    summary: z.string().trim().min(1).max(3000).optional(),
    body: z.string().trim().max(20000).nullable().optional(),
    beneficiaries: z.number().int().min(0).nullable().optional(),
    photos: z.array(photoUrlSchema).max(20).optional(),
    collaboratingClubIds: z.array(z.string().trim().min(1)).max(20).optional(),
    consentConfirmed: z.boolean().optional(),
    publishedTitle: z.string().trim().min(1).max(200).nullable().optional(),
    publishedSummary: z.string().trim().min(1).max(3000).nullable().optional(),
    publishedBody: z.string().trim().max(20000).nullable().optional(),
    editorNotes: z.string().trim().max(5000).nullable().optional(),
    rejectionReason: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(['submitted', 'published', 'rejected']).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
