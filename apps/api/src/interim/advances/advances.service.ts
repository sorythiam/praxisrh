import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentTransactionType, PayoutProvider } from '@praxis/shared';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { PayoutsService } from '../../core/payouts/payouts.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';
import { getCurrentUserId } from '../../core/tenancy/tenant-context';
import { RequestAdvanceDto } from './dto/advances.dto';

@Injectable()
export class AdvancesService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
    private payouts: PayoutsService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /** "Avances" (9.5) — self-service request, same review + shared payout connector as RH salary advances and IPM reimbursements. */
  async requestMyAdvance(dto: RequestAdvanceDto) {
    const employee = await this.currentEmployee.resolve();
    const advance = await this.client.interimAdvance.create({
      data: { employeeId: employee.id, amountFcfa: dto.amountFcfa },
    });
    await this.audit.log({ action: 'INTERIM_ADVANCE_REQUESTED', entityType: 'InterimAdvance', entityId: advance.id, after: advance });
    return advance;
  }

  async getMyAdvances() {
    const employee = await this.currentEmployee.resolve();
    return this.client.interimAdvance.findMany({ where: { employeeId: employee.id }, orderBy: { createdAt: 'desc' } });
  }

  list() {
    return this.client.interimAdvance.findMany({
      include: { employee: { include: { person: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(id: string, approve: boolean) {
    const before = await this.client.interimAdvance.findUnique({ where: { id } });
    if (!before) throw new BadRequestException('Demande introuvable.');
    if (before.status !== 'REQUESTED') throw new BadRequestException('Cette demande a déjà été traitée.');

    const advance = await this.client.interimAdvance.update({
      where: { id },
      data: { status: approve ? 'APPROVED' : 'REJECTED', decidedAt: new Date() },
    });
    await this.audit.log({ action: approve ? 'INTERIM_ADVANCE_APPROVED' : 'INTERIM_ADVANCE_REJECTED', entityType: 'InterimAdvance', entityId: id, before, after: advance });
    return advance;
  }

  async pay(id: string, provider: PayoutProvider = PayoutProvider.WAVE) {
    const advance = await this.client.interimAdvance.findUnique({
      where: { id },
      include: { employee: { include: { person: true } } },
    });
    if (!advance) throw new BadRequestException('Demande introuvable.');
    if (advance.status !== 'APPROVED') throw new BadRequestException('Seule une avance approuvée peut être payée.');

    const person = advance.employee.person;
    const batch = await this.payouts.runBulkPayout({
      type: PaymentTransactionType.ADVANCE,
      provider,
      initiatedBy: getCurrentUserId() ?? 'system',
      lines: [{ personId: advance.employee.personId, amountFcfa: advance.amountFcfa, mobileMoneyNumber: person?.mobileMoneyNumber ?? null }],
    });

    const item = batch.items[0];
    if (item.status === 'SUCCESS') {
      await this.client.interimAdvance.update({ where: { id }, data: { status: 'PAID', paymentTransactionId: item.paymentTransactionId } });
    }
    return batch;
  }
}
