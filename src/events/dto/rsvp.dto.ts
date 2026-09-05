import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const rsvpSchema = z.object({ status: z.enum(['going', 'maybe', 'not_going']) }).strict();
export type RsvpInput = z.infer<typeof rsvpSchema>;
export class RsvpDto extends createZodDto(rsvpSchema) {}
