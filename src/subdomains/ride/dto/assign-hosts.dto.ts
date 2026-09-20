import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const hostSchema = z.object({
  clubId: z.string().trim().min(1),
  daysHosted: z.number().int().min(0).max(400),
  membersSent: z.number().int().min(0).max(1000).default(0),
  hostFamilyName: z.string().trim().optional(),
  hostFamilyPhone: z.string().trim().optional(),
  hostAddress: z.string().trim().optional(),
});

export const assignHostsSchema = z
  .object({
    hosts: z.array(hostSchema).max(50),
    participantIds: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()
  .refine((v) => new Set(v.hosts.map((h) => h.clubId)).size === v.hosts.length, {
    message: 'Each club can appear at most once in hosts',
    path: ['hosts'],
  });
export type AssignHostsInput = z.infer<typeof assignHostsSchema>;
export class AssignHostsDto extends createZodDto(assignHostsSchema) {}
