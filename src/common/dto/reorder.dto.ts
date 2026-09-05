import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) }).strict();

export type ReorderInput = z.infer<typeof reorderSchema>;

export class ReorderDto extends createZodDto(reorderSchema) {}
