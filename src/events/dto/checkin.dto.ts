import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const checkinSchema = z
  .object({
    qrToken: z.string().trim().min(1).optional(),
    memberId: z.string().trim().min(1).optional(),
    walkInName: z.string().trim().min(1).max(200).optional(),
    clubId: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(
    (v) => {
      const qr = v.qrToken !== undefined && v.memberId === undefined && v.walkInName === undefined;
      const manual =
        v.memberId !== undefined && v.qrToken === undefined && v.walkInName === undefined;
      const walkIn =
        v.walkInName !== undefined &&
        v.clubId !== undefined &&
        v.qrToken === undefined &&
        v.memberId === undefined;
      return qr || manual || walkIn;
    },
    { message: 'Provide exactly one of qrToken, memberId, or (walkInName and clubId)' },
  );
export type CheckinInput = z.infer<typeof checkinSchema>;
export class CheckinDto extends createZodDto(checkinSchema) {}
