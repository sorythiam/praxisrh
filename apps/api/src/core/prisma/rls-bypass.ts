import { PrismaClient } from '@prisma/client';

/**
 * The only sanctioned way to read/write tenant-scoped tables without a
 * resolved tenant in context. Used by exactly three call sites:
 *  - ModuleGuard (checks module activation before the request's tenant
 *    transaction exists yet — it IS what resolves the tenant),
 *  - AuthService.login (must search across tenants by email/phone to
 *    find which tenant a user belongs to),
 *  - BackofficeController (PRAXIS_ADMIN is cross-tenant by design).
 * Nothing else should import this. It does not disable the Prisma
 * Client Extension's tenantId injection — it only satisfies the RLS
 * policy's `app.bypass_rls` clause for the duration of one transaction,
 * so it still requires going through the plain PrismaService, not
 * TenantPrismaService.
 */
export async function withRlsBypass<T>(
  prisma: PrismaClient,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'on'`);
    return fn(tx as unknown as PrismaClient);
  });
}
