import { AsyncLocalStorage } from 'node:async_hooks';
import { Role } from '@praxis/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

export interface TenantStore {
  tenantId: string | null;
  userId: string | null;
  role: Role | null;
  /**
   * The transactional Prisma client bound to this request. Set by
   * TenantTransactionInterceptor once the request-scoped transaction is
   * open. Tenant-scoped repositories must always read through
   * `getTenantPrismaOrThrow()` rather than injecting PrismaService
   * directly, so they can never accidentally use a connection that
   * hasn't had `app.tenant_id` set for RLS.
   */
  tx: Prisma.TransactionClient | PrismaClient | null;
}

export const tenantAls = new AsyncLocalStorage<TenantStore>();

export function getTenantStore(): TenantStore | undefined {
  return tenantAls.getStore();
}

export function getCurrentTenantId(): string | null {
  return tenantAls.getStore()?.tenantId ?? null;
}

export function getCurrentUserId(): string | null {
  return tenantAls.getStore()?.userId ?? null;
}

export function getCurrentRole(): Role | null {
  return tenantAls.getStore()?.role ?? null;
}

export function requireTenantId(): string {
  const id = getCurrentTenantId();
  if (!id) {
    throw new Error(
      'No tenant in context: this operation requires an authenticated, tenant-scoped request.',
    );
  }
  return id;
}
