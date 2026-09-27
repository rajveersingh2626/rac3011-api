import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export type RideFormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'link'
  | 'radio'
  | 'file'
  | 'multiselect';

export const rideFormFieldDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.string(),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export type RideFormFieldDefinition = z.infer<typeof rideFormFieldDefinitionSchema>;

export const createRideFormSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  targetRoles: z.array(z.string()).optional(),
  fields: z.array(rideFormFieldDefinitionSchema),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export class CreateRideFormDto extends createZodDto(createRideFormSchema) {}

export const updateRideFormSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  targetRoles: z.array(z.string()).optional(),
  fields: z.array(rideFormFieldDefinitionSchema).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export class UpdateRideFormDto extends createZodDto(updateRideFormSchema) {}

export const submitRideFormSchema = z.object({
  values: z.record(z.string(), z.any()),
});

export class SubmitRideFormDto extends createZodDto(submitRideFormSchema) {}

export const updateSubmissionStatusSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'approved', 'declined']),
  notes: z.string().optional(),
});

export class UpdateSubmissionStatusDto extends createZodDto(updateSubmissionStatusSchema) {}
