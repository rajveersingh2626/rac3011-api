import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { BOOKING_DECISIONS } from '../drr-bookings.types';

export const decideDrrBookingSchema = z
  .object({
    status: z.enum(BOOKING_DECISIONS),
    decisionReason: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export type DecideDrrBookingInput = z.infer<typeof decideDrrBookingSchema>;

export class DecideDrrBookingDto extends createZodDto(decideDrrBookingSchema) {}
