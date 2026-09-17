import { z } from 'zod';

export type FormFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'link';

export interface FormFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  helperText?: string;
  options?: string[];
}

export const formFieldDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'email', 'phone', 'date', 'select', 'textarea', 'checkbox', 'link']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  options: z.array(z.string()).optional(),
});
