import type { PrismaClient } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { TENANT_SCOPED_MODELS } from './tenant-scoped.models';

// Every one of these accepts `tenantId` merged alongside the primary
// filter — including findUnique/update/delete/upsert, whose `where` is a
// "WhereUniqueInput". Since Prisma 4.5, WhereUniqueInput accepts the
// unique selector (bare `id`, or a compound key like
// `employeeId_periodYear_periodMonth`) *combined* with additional
// non-unique scalar filters as an implicit AND — so merging `tenantId`
// in is enough to make a cross-tenant lookup by id resolve to "not
// found" exactly like a wrong id would, with no separate pre-check needed.
const WHERE_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * Binds a Prisma client (normally the request's transaction client) to a
 * single tenant for its lifetime. Every operation against a tenant-scoped
 * model is rewritten to include `tenantId` — the caller can never forget
 * it, and can never override it to reach another tenant's data.
 *
 * Typed loosely on purpose: this runs against both the plain
 * PrismaClient and the interactive-transaction client Prisma hands us
 * in `$transaction(async (tx) => ...)`, and Prisma's own TypeScript
 * types for the latter don't expose `$extends` even though it works
 * correctly at runtime (this is Prisma's client-extension pattern,
 * applied to a transaction client rather than the top-level client).
 */
export function withTenantScoping(client: any, tenantId: string): PrismaClient {
  return client.$extends({
    name: 'tenant-scoping',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const a = (args ?? {}) as Record<string, any>;

          if (operation === 'create') {
            a.data = { ...(a.data ?? {}), tenantId };
            return query(a);
          }

          if (operation === 'createMany' || operation === 'createManyAndReturn') {
            const rows = Array.isArray(a.data) ? a.data : [a.data];
            a.data = rows.map((row: Record<string, any>) => ({ ...row, tenantId }));
            return query(a);
          }

          if (operation === 'upsert') {
            a.where = { ...(a.where ?? {}), tenantId };
            a.create = { ...(a.create ?? {}), tenantId };
            return query(a);
          }

          if (WHERE_OPS.has(operation)) {
            a.where = { ...(a.where ?? {}), tenantId };
            return query(a);
          }

          // Any operation not explicitly handled above is refused rather
          // than silently allowed through unscoped.
          throw new ForbiddenException(
            `Operation "${operation}" on tenant-scoped model "${model}" is not covered by tenant scoping and has been blocked.`,
          );
        },
      },
    },
  });
}
