import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PROJECT_KEYS } from '../../public/project-summary.registry';
import type { ProjectKey } from '../../common/types/access';

const projectKeyTuple = PROJECT_KEYS as unknown as [ProjectKey, ...ProjectKey[]];

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
const photoUrlSchema = z.string().trim().url().max(1024);

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    slug: z.string().trim().min(1).max(120).optional(),
    startsAt: isoDateTime.optional(),
    endsAt: isoDateTime.nullable().optional(),
    location: z.string().trim().max(300).nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    coverUrl: z.string().trim().url().max(1024).nullable().optional(),
    isDistrictEvent: z.boolean().optional(),
    clubId: z.string().trim().min(1).nullable().optional(),
    projectKey: z.enum(projectKeyTuple).nullable().optional(),
    rsvpOpen: z.boolean().optional(),
    capacity: z.number().int().min(1).nullable().optional(),
    photos: z.array(photoUrlSchema).max(30).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' });
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export class UpdateEventDto extends createZodDto(updateEventSchema) {}
