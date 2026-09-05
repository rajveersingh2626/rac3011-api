import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { audienceSchema } from './audience.schema';

export const audienceEstimateSchema = z.object({ audience: audienceSchema }).strict();
export type AudienceEstimateInput = z.infer<typeof audienceEstimateSchema>;
export class AudienceEstimateDto extends createZodDto(audienceEstimateSchema) {}
