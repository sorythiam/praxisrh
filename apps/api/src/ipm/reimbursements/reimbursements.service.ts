import { BadRequestException, Injectable } from '@nestjs/common';
import { IpmCapCategory, IpmCardStatus, IpmCaseStatus } from '@prisma/client';
import { PaymentTransactionType, PayoutProvider } from '@praxis/shared';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PayoutsService } from '../../core/payouts/payouts.service';
import { StorageService } from '../../core/storage/storage.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';
import { getCurrentUserId, requireTenantId } from '../../core/tenancy/tenant-context';
import { computeEffectiveCardStatus } from '../ipm-common';
import { DecideReimbursementDto, SetAnnualCapDto, SubmitReimbursementDto } from './dto/reimbursements.dto';

// "Actes sensibles" requiring the second (medical) validation level —
// section 8.4. No separate "contrôleur médical" account type exists in
// this build's role model (same simplification as the provider portal —
// see providers.controller.ts); IPM_MANAGER performs both steps, with
// reviewedBy recording who acted at each stage.
const SENSITIVE_CATEGORIES: IpmCapCategory[] = [IpmCapCategory.HOSPITALISATION];

const PRISMA_UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class ReimbursementsService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private payouts: PayoutsService,
    private storage: StorageService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  async submitMyCase(dto: SubmitReimbursementDto) {
    const employee = await this.currentEmployee.resolve();
    const beneficiary = await this.client.ipmBeneficiary.findUnique({
      where: { employeeId: employee.id },
      include: { employee: true },
    });
    if (!beneficiary) {
      throw new BadRequestException("Vous n'êtes pas adhérent IPM.");
    }
    if (computeEffectiveCardStatus(beneficiary) !== IpmCardStatus.ACTIVE) {
      throw new BadRequestException("Votre couverture IPM n'est pas active.");
    }

    try {
      const reimbursementCase = await this.client.ipmReimbursementCase.create({
        data: {
          beneficiaryId: beneficiary.id,
          dependentId: dto.dependentId,
          category: dto.category,
          invoiceNumber: dto.invoiceNumber,
          providerName: dto.providerName,
          amountClaimedFcfa: dto.amountClaimedFcfa,
          justifiesAbsenceFrom: dto.justifiesAbsenceFrom ? new Date(dto.justifiesAbsenceFrom) : undefined,
          justifiesAbsenceTo: dto.justifiesAbsenceTo ? new Date(dto.justifiesAbsenceTo) : undefined,
          status: IpmCaseStatus.SUBMITTED,
        },
      });
      await this.audit.log({
        action: 'IPM_CASE_SUBMITTED',
        entityType: 'IpmReimbursementCase',
        entityId: reimbursementCase.id,
        after: reimbursementCase,
      });
      return reimbursementCase;
    } catch (err: any) {
      if (err.code === PRISMA_UNIQUE_VIOLATION) {
        throw new BadRequestException(
          "Une demande avec ce numéro de facture a déjà été soumise pour ce bénéficiaire.",
        );
      }
      throw err;
    }
  }

  async uploadDocument(caseId: string, filename: string, content: Buffer) {
    const tenantId = requireTenantId();
    const relativePath = `${tenantId}/ipm-documents/${caseId}/${Date.now()}-${filename}`;
    await this.storage.save(relativePath, content);
    const existing = await this.client.ipmReimbursementCase.findUnique({ where: { id: caseId } });
    if (!existing) throw new BadRequestException('Dossier introuvable.');
    const documentUrls = Array.isArray(existing.documentUrls) ? existing.documentUrls : [];
    return this.client.ipmReimbursementCase.update({
      where: { id: caseId },
      data: { documentUrls: [...documentUrls, relativePath] },
    });
  }

  async downloadDocument(relativePath: string) {
    return this.storage.read(relativePath);
  }

  listCases(filters: { status?: IpmCaseStatus; beneficiaryId?: string }) {
    return this.client.ipmReimbursementCase.findMany({
      where: { status: filters.status, beneficiaryId: filters.beneficiaryId },
      include: { beneficiary: { include: { employee: { include: { person: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyCases() {
    const employee = await this.currentEmployee.resolve();
    const beneficiary = await this.client.ipmBeneficiary.findUnique({ where: { employeeId: employee.id } });
    if (!beneficiary) return [];
    return this.listCases({ beneficiaryId: beneficiary.id });
  }

  async getCase(id: string) {
    const reimbursementCase = await this.client.ipmReimbursementCase.findUnique({
      where: { id },
      include: { beneficiary: { include: { employee: { include: { person: true } } } } },
    });
    if (!reimbursementCase) throw new BadRequestException('Dossier introuvable.');
    return reimbursementCase;
  }

  /** "L'historique complet de consommation d'un bénéficiaire" (8.5 user story) — for the medical reviewer to check before validating a sensitive act. */
  getBeneficiaryHistory(beneficiaryId: string) {
    return this.client.ipmReimbursementCase.findMany({ where: { beneficiaryId }, orderBy: { createdAt: 'desc' } });
  }

  /**
   * "Calcul automatique de la quote-part avec plafonds par poste"
   * (8.4): coverage rate applied to the claimed amount, then capped by
   * whatever annual plafond remains for that category — never negative,
   * never above what's actually left to spend this year.
   */
  private async calculateReimbursableAmount(beneficiaryId: string, category: IpmCapCategory, amountClaimedFcfa: number, coverageRatePercent: number) {
    const baseAmount = Math.round(amountClaimedFcfa * (coverageRatePercent / 100));
    const cap = await this.client.ipmAnnualCap.findUnique({ where: { tenantId_category: { tenantId: requireTenantId(), category } } });
    if (!cap) return baseAmount;

    const yearStart = new Date(Date.UTC(new Date().getFullYear(), 0, 1));
    const consumed = await this.client.ipmReimbursementCase.aggregate({
      where: {
        beneficiaryId,
        category,
        status: { in: [IpmCaseStatus.APPROVED, IpmCaseStatus.PAID] },
        createdAt: { gte: yearStart },
      },
      _sum: { amountApprovedFcfa: true },
    });
    const consumedFcfa = consumed._sum.amountApprovedFcfa ?? 0;
    const remainingFcfa = Math.max(0, cap.annualCapFcfa - consumedFcfa);
    return Math.min(baseAmount, remainingFcfa);
  }

  /** First-level decision by the gestionnaire. Sensitive categories route to medical review instead of a final decision. */
  async gestionnaireDecision(id: string, dto: DecideReimbursementDto) {
    const reimbursementCase = await this.getCase(id);
    if (reimbursementCase.status !== IpmCaseStatus.SUBMITTED) {
      throw new BadRequestException('Ce dossier a déjà été traité.');
    }

    if (!dto.approve) {
      return this.reject(id, dto.rejectionReasonCode);
    }

    if (SENSITIVE_CATEGORIES.includes(reimbursementCase.category)) {
      const updated = await this.client.ipmReimbursementCase.update({
        where: { id },
        data: { status: IpmCaseStatus.PENDING_MEDICAL_REVIEW, reviewedBy: getCurrentUserId(), reviewedAt: new Date() },
      });
      await this.audit.log({ action: 'IPM_CASE_SENT_TO_MEDICAL_REVIEW', entityType: 'IpmReimbursementCase', entityId: id, after: updated });
      return updated;
    }

    return this.approve(reimbursementCase);
  }

  /** Second-level decision for sensitive acts. */
  async medicalReview(id: string, dto: DecideReimbursementDto) {
    const reimbursementCase = await this.getCase(id);
    if (reimbursementCase.status !== IpmCaseStatus.PENDING_MEDICAL_REVIEW) {
      throw new BadRequestException("Ce dossier n'est pas en attente de contrôle médical.");
    }
    if (!dto.approve) {
      return this.reject(id, dto.rejectionReasonCode);
    }
    return this.approve(reimbursementCase);
  }

  private async reject(id: string, rejectionReasonCode?: string) {
    const before = await this.getCase(id);
    const updated = await this.client.ipmReimbursementCase.update({
      where: { id },
      data: {
        status: IpmCaseStatus.REJECTED,
        rejectionReasonCode: rejectionReasonCode ?? 'NON_MOTIVE',
        reviewedBy: getCurrentUserId(),
        reviewedAt: new Date(),
      },
    });
    await this.audit.log({ action: 'IPM_CASE_REJECTED', entityType: 'IpmReimbursementCase', entityId: id, before, after: updated });
    await this.notifications.send({
      personId: before.beneficiary.employee.personId,
      template: 'IPM_CASE_REJECTED',
      payload: { rejectionReasonCode },
    });
    return updated;
  }

  private async approve(reimbursementCase: any) {
    const amountApprovedFcfa = await this.calculateReimbursableAmount(
      reimbursementCase.beneficiaryId,
      reimbursementCase.category,
      reimbursementCase.amountClaimedFcfa,
      reimbursementCase.beneficiary.coverageRatePercent,
    );

    const updated = await this.client.ipmReimbursementCase.update({
      where: { id: reimbursementCase.id },
      data: { status: IpmCaseStatus.APPROVED, amountApprovedFcfa, reviewedBy: getCurrentUserId(), reviewedAt: new Date() },
    });

    // Section 10.3: a hospitalisation/maladie case with absence dates
    // automatically justifies the corresponding RH absence, rather than
    // the employee risking an unjustified-absence sanction for time off
    // that IPM already has documentary proof for.
    if (reimbursementCase.justifiesAbsenceFrom && reimbursementCase.justifiesAbsenceTo) {
      const leaveRequest = await this.client.leaveRequest.create({
        data: {
          employeeId: reimbursementCase.beneficiary.employeeId,
          type: 'MALADIE',
          startDate: reimbursementCase.justifiesAbsenceFrom,
          endDate: reimbursementCase.justifiesAbsenceTo,
          days: this.countDays(reimbursementCase.justifiesAbsenceFrom, reimbursementCase.justifiesAbsenceTo),
          status: 'APPROVED',
          reason: `Justifié automatiquement par le dossier IPM #${reimbursementCase.id.slice(0, 8)}`,
          hrDecisionAt: new Date(),
        },
      });
      await this.client.ipmReimbursementCase.update({ where: { id: reimbursementCase.id }, data: { linkedLeaveRequestId: leaveRequest.id } });
    }

    await this.audit.log({
      action: 'IPM_CASE_APPROVED',
      entityType: 'IpmReimbursementCase',
      entityId: reimbursementCase.id,
      before: reimbursementCase,
      after: updated,
    });
    await this.notifications.send({
      personId: reimbursementCase.beneficiary.employee.personId,
      template: 'IPM_CASE_APPROVED',
      payload: { amountApprovedFcfa },
    });
    return updated;
  }

  private countDays(from: Date, to: Date): number {
    return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
  }

  setAnnualCap(dto: SetAnnualCapDto) {
    return this.client.ipmAnnualCap.upsert({
      where: { tenantId_category: { tenantId: requireTenantId(), category: dto.category } },
      update: { annualCapFcfa: dto.annualCapFcfa },
      create: { category: dto.category, annualCapFcfa: dto.annualCapFcfa },
    });
  }

  listAnnualCaps() {
    return this.client.ipmAnnualCap.findMany();
  }

  /** "Le bénéficiaire ... reçoit son remboursement par mobile money" (section 8.4/10.5) — same shared payout connector as salaries and advances. */
  async pay(id: string, provider: PayoutProvider = PayoutProvider.WAVE) {
    const reimbursementCase = await this.getCase(id);
    if (reimbursementCase.status !== IpmCaseStatus.APPROVED) {
      throw new BadRequestException('Seul un dossier approuvé peut être payé.');
    }
    const person = reimbursementCase.beneficiary.employee.person;

    const batch = await this.payouts.runBulkPayout({
      type: PaymentTransactionType.REIMBURSEMENT,
      provider,
      initiatedBy: getCurrentUserId() ?? 'system',
      lines: [
        {
          personId: reimbursementCase.beneficiary.employee.personId,
          amountFcfa: reimbursementCase.amountApprovedFcfa,
          mobileMoneyNumber: person?.mobileMoneyNumber ?? null,
        },
      ],
    });

    const item = batch.items[0];
    if (item.status === 'SUCCESS') {
      await this.client.ipmReimbursementCase.update({
        where: { id },
        data: { status: IpmCaseStatus.PAID, paymentTransactionId: item.paymentTransactionId },
      });
    }
    return batch;
  }
}
