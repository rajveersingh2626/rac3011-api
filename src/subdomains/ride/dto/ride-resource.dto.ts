import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createRideResourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().default('guidelines'),
  scope: z.enum(['all', 'club', 'member']).default('all'),
  targetClubName: z.string().trim().optional(),
  targetMemberEmail: z.string().trim().email().optional(),
  targetDistrict: z.string().trim().optional(),
  driveUrl: z.string().trim().url(),
  description: z.string().trim().optional(),
  order: z.number().int().default(0),
});

export type CreateRideResourceInput = z.infer<typeof createRideResourceSchema>;
export class CreateRideResourceDto extends createZodDto(createRideResourceSchema) {}

export const rideResourceFilterSchema = z.object({
  category: z.string().optional(),
  scope: z.string().optional(),
  targetClubName: z.string().optional(),
  targetMemberEmail: z.string().optional(),
  targetDistrict: z.string().optional(),
});

export type RideResourceFilter = z.infer<typeof rideResourceFilterSchema>;
