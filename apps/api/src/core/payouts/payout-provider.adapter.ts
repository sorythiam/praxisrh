import { Injectable, Logger } from '@nestjs/common';
import { PayoutProvider } from '@praxis/shared';

export interface PayoutRequest {
  reference: string;
  amountFcfa: number;
  recipientMobileNumber: string | null;
}

export interface PayoutResult {
  success: boolean;
  providerReference?: string;
  failureReason?: string;
}

/**
 * Abstraction over Wave / Orange Money bulk payment APIs. This mock
 * adapter never calls a real network endpoint — it deterministically
 * simulates the one failure mode that matters most operationally (a
 * missing/invalid mobile money number on file), so the reconciliation
 * UI and retry flow have something real to exercise. Swap the body of
 * `payout()` for the actual Wave/Orange Money HTTP call; every payroll,
 * advance and IPM reimbursement payment already flows through this one
 * connector, per the "moteur de paiement mobile money partagé" principle.
 */
@Injectable()
export class PayoutProviderAdapter {
  private readonly logger = new Logger(PayoutProviderAdapter.name);

  async payout(provider: PayoutProvider, request: PayoutRequest): Promise<PayoutResult> {
    this.logger.log(`[${provider} stub] payout ${request.amountFcfa} FCFA -> ${request.recipientMobileNumber ?? 'N/A'}`);

    if (!request.recipientMobileNumber) {
      return { success: false, failureReason: 'Numéro mobile money manquant sur le dossier.' };
    }
    if (request.amountFcfa <= 0) {
      return { success: false, failureReason: 'Montant invalide.' };
    }
    return { success: true, providerReference: `${provider}-${request.reference}` };
  }
}
