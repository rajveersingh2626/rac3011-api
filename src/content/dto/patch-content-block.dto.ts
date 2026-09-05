import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CONTENT_TYPES } from '../content.types';

export const patchContentBlockSchema = z
  .object({
    type: z.enum(CONTENT_TYPES).optional(),
    draftValue: z.unknown().optional(),
    publish: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.type !== undefined || v.draftValue !== undefined || v.publish !== undefined, {
    message: 'At least one of type, draftValue, publish is required',
  });

export type PatchContentBlockInput = z.infer<typeof patchContentBlockSchema>;

export class PatchContentBlockDto extends createZodDto(patchContentBlockSchema) {}
