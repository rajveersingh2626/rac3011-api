import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FEEDBACK_CATEGORIES } from '../feedback.types';

export const createFeedbackSchema = z
  .object({
    category: z.enum(FEEDBACK_CATEGORIES),
    message: z.string().trim().min(1).max(3000),
    eventId: z.string().trim().min(1).optional(),
    anonymous: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.category !== 'event' || !!v.eventId, {
    message: 'eventId is required when category is "event"',
    path: ['eventId'],
  });
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export class CreateFeedbackDto extends createZodDto(createFeedbackSchema) {}
