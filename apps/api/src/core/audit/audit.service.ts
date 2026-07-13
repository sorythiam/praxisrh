import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { getCurrentUserId } from '../tenancy/tenant-context';

/**
 * Auditability requirement from the spec: every action that changes a
 * personnel file, payroll, contract or status is historicized with
 * author, date and before/after value. Call this explicitly from
 * services after a mutation that matters (not every read, not every
 * trivial field edit — the meaningful state transitions: contract
 * signed, leave approved/rejected, payroll validated, payout initiated).
 */
@Injectable()
export class AuditService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  async log(params: {
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  }) {
    await (this.tenantPrisma.client as any).auditLog.create({
      data: {
        actorUserId: getCurrentUserId(),
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
        after: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
      },
    });
  }
}
