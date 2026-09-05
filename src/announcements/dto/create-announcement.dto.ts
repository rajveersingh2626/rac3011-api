import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ANNOUNCEMENT_CHANNELS } from '../announcements.types';
import { audienceSchema } from './audience.schema';

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
    audience: audienceSchema,
    channels: z.array(z.enum(ANNOUNCEMENT_CHANNELS)).min(1).default(['portal']),
  })
  .strict();
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export class CreateAnnouncementDto extends createZodDto(createAnnouncementSchema) {}
