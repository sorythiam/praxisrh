import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * The raw, unextended Prisma client. Only three things are allowed to use
 * it directly:
 *  1. TenantTransactionInterceptor, to open the per-request transaction
 *     and wrap it with tenant scoping.
 *  2. The PRAXIS_ADMIN back-office module, which by design operates
 *     across tenants (managing subscriptions/module activation) and
 *     therefore builds its own explicit, audited queries.
 *  3. The seed script.
 * Everything else must go through TenantPrismaService.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
