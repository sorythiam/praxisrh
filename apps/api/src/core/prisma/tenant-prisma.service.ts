import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { getTenantStore } from '../tenancy/tenant-context';

/**
 * Injected wherever tenant-scoped business logic needs the database.
 * `.client` resolves to the request's tenant-bound transaction client
 * (set by TenantTransactionInterceptor). There is no way to obtain an
 * unscoped client through this service — that is the point.
 */
@Injectable()
export class TenantPrismaService {
  get client(): PrismaClient {
    const store = getTenantStore();
    if (!store?.tx) {
      throw new Error(
        'No tenant-scoped Prisma client in context. Is this call happening outside an HTTP request (e.g. in a script)? Use PrismaService + withTenantScoping directly there.',
      );
    }
    return store.tx as PrismaClient;
  }
}
