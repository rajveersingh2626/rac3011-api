import { Prisma } from '@prisma/client';
import type { CacheInvalidator } from '../cache/cache-invalidator.service';
import { getModelTags } from '../cache/model-tag-map';

const WRITE_OPERATIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

export function buildCacheInvalidationExtension(cacheInvalidator: CacheInvalidator) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'cache-invalidation',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const result: unknown = await query(args);
            if (WRITE_OPERATIONS.has(operation)) {
              const tags = getModelTags(model);
              if (tags.length > 0) await cacheInvalidator.purge(tags);
            }
            return result;
          },
        },
      },
    }),
  );
}
