import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PayoutProvider, PaymentTransactionType, PayoutStatus } from '@praxis/shared';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { PayoutProviderAdapter } from './payout-provider.adapter';

export interface PayoutLine {
  personId: string;
  amountFcfa: number;
  mobileMoneyNumber: string | null;
}

/**
 * Generates and reconciles a mass payment order — shared by salary
 * payment, advances and (later) IPM reimbursements, per section 5.2 /
 * 10.5 of the spec ("le même connecteur bulk payment sert aux salaires,
 * aux acomptes et aux remboursements santé").
 */
@Injectable()
export class PayoutsService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private adapter: PayoutProviderAdapter,
  ) {}

  async runBulkPayout(params: {
    type: PaymentTransactionType;
    provider: PayoutProvider;
    initiatedBy: string;
    lines: PayoutLine[];
  }) {
    const client = this.tenantPrisma.client as any;
    const totalAmountFcfa = params.lines.reduce((s, l) => s + l.amountFcfa, 0);

    const batch = await client.payoutBatch.create({
      data: {
        type: params.type,
        provider: params.provider,
        totalAmountFcfa,
        initiatedBy: params.initiatedBy,
        status: PayoutStatus.INITIATED,
      },
    });

    for (const line of params.lines) {
      const reference = `${batch.id.slice(0, 8)}-${nanoid(8)}`;
      const result = await this.adapter.payout(params.provider, {
        reference,
        amountFcfa: line.amountFcfa,
        recipientMobileNumber: line.mobileMoneyNumber,
      });

      const transaction = await client.paymentTransaction.create({
        data: {
          type: params.type,
          provider: params.provider,
          amountFcfa: line.amountFcfa,
          personId: line.personId,
          reference,
          status: result.success ? PayoutStatus.SUCCESS : PayoutStatus.FAILED,
          failureReason: result.failureReason,
          settledAt: result.success ? new Date() : undefined,
        },
      });

      await client.payoutItem.create({
        data: {
          payoutBatchId: batch.id,
          personId: line.personId,
          amountFcfa: line.amountFcfa,
          status: result.success ? PayoutStatus.SUCCESS : PayoutStatus.FAILED,
          providerReference: result.providerReference,
          failureReason: result.failureReason,
          paymentTransactionId: transaction.id,
        },
      });
    }

    const items = await client.payoutItem.findMany({ where: { payoutBatchId: batch.id } });
    const allSucceeded = items.every((i: any) => i.status === PayoutStatus.SUCCESS);
    const updated = await client.payoutBatch.update({
      where: { id: batch.id },
      data: { status: allSucceeded ? PayoutStatus.SUCCESS : PayoutStatus.FAILED, completedAt: new Date() },
      include: { items: true },
    });

    return updated;
  }
}
