import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { withTenantScoping } from '../prisma/tenant-scoping.extension';
import { getTenantStore } from './tenant-context';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Wraps every authenticated, tenant-scoped request in a single database
 * transaction:
 *  - sets the `app.tenant_id` session variable that the RLS policies
 *    check (defense-in-depth layer),
 *  - runs it through the Prisma tenant-scoping extension (the primary
 *    enforcement layer),
 *  - publishes the resulting client into the request's AsyncLocalStorage
 *    store so TenantPrismaService can hand it to any service call
 *    downstream.
 *
 * Important Prisma quirk this works around: a transaction client
 * (`Prisma.TransactionClient`, the `tx` you get inside
 * `$transaction(async (tx) => ...)`) does NOT itself expose `$extends` —
 * extending has to happen on the top-level client *first*. Extensions do
 * propagate into `$transaction` correctly when called the other way
 * around, so we extend once per request and then open the transaction
 * on that already-extended client.
 *
 * Requests with no tenant (PRAXIS_ADMIN back-office calls) skip this
 * entirely and run against the plain client — that module builds its
 * own explicit, audited cross-tenant queries by design.
 */
@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const store = getTenantStore();
    if (!store?.tenantId) {
      return next.handle();
    }
    if (!UUID_RE.test(store.tenantId)) {
      throw new Error('Invalid tenantId shape in auth context.');
    }

    const scopedClient = withTenantScoping(this.prisma, store.tenantId);

    return from(
      scopedClient.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${store.tenantId}'`);
        store.tx = tx as any;
        return firstValueFrom(next.handle());
      }),
    );
  }
}
