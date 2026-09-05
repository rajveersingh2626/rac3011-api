import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const recheckAssetLinkSchema = z.object({ recheck: z.literal(true) }).strict();

export type RecheckAssetLinkInput = z.infer<typeof recheckAssetLinkSchema>;

export class RecheckAssetLinkDto extends createZodDto(recheckAssetLinkSchema) {}
