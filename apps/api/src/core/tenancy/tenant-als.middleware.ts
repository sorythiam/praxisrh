import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantAls, TenantStore } from './tenant-context';

/**
 * Opens an empty AsyncLocalStorage context for the lifetime of the
 * request. JwtAuthGuard (runs later in the pipeline, still inside this
 * context) fills in tenantId/userId/role once the token is verified.
 * TenantTransactionInterceptor fills in `tx` once the request
 * transaction is opened. Every downstream await stays inside this
 * context because they all descend from the synchronous `next()` call
 * below.
 */
@Injectable()
export class TenantAlsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const store: TenantStore = { tenantId: null, userId: null, role: null, tx: null };
    tenantAls.run(store, () => next());
  }
}
