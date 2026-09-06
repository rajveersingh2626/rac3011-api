import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { BOOKING_PURPOSES } from '../drr-bookings.types';

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());

const MAX_SPAN_MS = 24 * 60 * 60 * 1000;
// A DRR term is one Rotary year, so nothing beyond the next one can be honoured.
const MAX_HORIZON_MS = 18 * 30 * 24 * 60 * 60 * 1000;

export const createDrrBookingSchema = z
  .object({
    purpose: z.enum(BOOKING_PURPOSES),
    clubId: z.string().trim().min(1).max(64).optional(),
    requesterName: z.string().trim().min(1).max(200),
    requesterEmail: z.string().trim().email(),
    requesterPhone: z.string().trim().min(5).max(32),
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    notes: z.string().trim().max(2000).optional(),
    // Honeypot: real users never fill this hidden field; bots that autofill every input do.
    website: z.string().max(200).optional(),
  })
  .strict()
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  })
  .refine((v) => new Date(v.startsAt).getTime() > Date.now(), {
    message: 'startsAt must be in the future',
    path: ['startsAt'],
  })
  .refine((v) => new Date(v.endsAt).getTime() - new Date(v.startsAt).getTime() <= MAX_SPAN_MS, {
    message: 'a booking cannot span more than 24 hours',
    path: ['endsAt'],
  })
  .refine((v) => new Date(v.startsAt).getTime() <= Date.now() + MAX_HORIZON_MS, {
    message: 'startsAt must be within 18 months from now',
    path: ['startsAt'],
  });

export type CreateDrrBookingInput = z.infer<typeof createDrrBookingSchema>;

export class CreateDrrBookingDto extends createZodDto(createDrrBookingSchema) {}
