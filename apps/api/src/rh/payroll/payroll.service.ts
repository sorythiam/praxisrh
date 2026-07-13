import { BadRequestException, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import {
  LeaveRequestStatus,
  LeaveType,
  PaymentTransactionType,
  PayoutProvider,
  PayoutStatus,
  PayrollReportStatus,
} from '@praxis/shared';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { RulesService } from '../../core/rules/rules.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { StorageService } from '../../core/storage/storage.service';
import { PayoutsService } from '../../core/payouts/payouts.service';
import { TimeclockService } from '../timeclock/timeclock.service';
import { requireTenantId } from '../../core/tenancy/tenant-context';
import { renderPayslipHtml } from './payslip-template';

const MONTHLY_WEEKS = 52 / 12;

@Injectable()
export class PayrollService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private rules: RulesService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private storage: StorageService,
    private payouts: PayoutsService,
    private timeclock: TimeclockService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /**
   * "Un rapport de paie mensuel consolidant automatiquement tous les
   * éléments variables ... directement depuis le planning et le
   * pointage, sans double saisie" (section 6.5). Idempotent: re-running
   * for the same period recomputes every line from source data.
   */
  async generate(year: number, month: number) {
    const tenantId = requireTenantId();
    const ruleSet = await this.rules.getActiveRuleSet('SN');
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const report = await this.client.payrollReport.upsert({
      where: { tenantId_periodYear_periodMonth: { tenantId, periodYear: year, periodMonth: month } },
      update: { status: PayrollReportStatus.DRAFT },
      create: { periodYear: year, periodMonth: month, status: PayrollReportStatus.DRAFT },
    });

    const employees = await this.client.employee.findMany({
      where: { status: { in: ['ACTIVE', 'ON_LEAVE'] } },
      include: {
        person: true,
        contracts: { where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' }, take: 1 },
      },
    });

    let anyAnomaly = false;

    for (const employee of employees) {
      const contract = employee.contracts[0];
      if (!contract) continue;

      const monthlyLegalHours = contract.weeklyHours * MONTHLY_WEEKS;
      const { plannedHours, actualHours } = await this.timeclock.computeActualVsPlannedHours(
        employee.id,
        periodStart,
        periodEnd,
      );

      const overtimeHours = Math.max(0, actualHours - monthlyLegalHours);
      const hourlyRate = contract.baseSalaryFcfa / monthlyLegalHours;
      const overtimeMultiplier = this.rules.computeOvertimeMultiplier(ruleSet, overtimeHours);
      const overtimeAmountFcfa = Math.round(overtimeHours * hourlyRate * overtimeMultiplier);

      const unpaidLeaveDays = await this.sumApprovedLeaveDays(employee.id, LeaveType.SANS_SOLDE, periodStart, periodEnd);
      const dailyRate = contract.baseSalaryFcfa / 30;
      const unpaidLeaveDeductionFcfa = Math.round(unpaidLeaveDays * dailyRate);

      const advancesDeductedFcfa = await this.sumAdvances(employee.personId, periodStart, periodEnd);

      const bonusesFcfa = 0;
      const grossSalaryFcfa = Math.max(
        0,
        contract.baseSalaryFcfa + overtimeAmountFcfa + bonusesFcfa - unpaidLeaveDeductionFcfa,
      );
      const employeeContributionsFcfa = this.rules.computeEmployeeSocialContributions(ruleSet, grossSalaryFcfa);
      const incomeTaxFcfa = this.rules.computeIncomeTax(ruleSet, grossSalaryFcfa * 12);
      const netSalaryFcfa = Math.max(
        0,
        grossSalaryFcfa - employeeContributionsFcfa - incomeTaxFcfa - advancesDeductedFcfa,
      );

      const anomalyFlags = await this.detectAnomalies({
        employeeId: employee.id,
        actualHours,
        netSalaryFcfa,
        year,
        month,
      });
      if (anomalyFlags.length > 0) anyAnomaly = true;

      await this.client.payslipLine.upsert({
        where: { payrollReportId_employeeId: { payrollReportId: report.id, employeeId: employee.id } },
        update: {
          baseSalaryFcfa: contract.baseSalaryFcfa,
          overtimeHours,
          overtimeAmountFcfa,
          bonusesFcfa,
          advancesDeductedFcfa,
          grossSalaryFcfa,
          employeeContributionsFcfa,
          incomeTaxFcfa,
          netSalaryFcfa,
          anomalyFlags,
        },
        create: {
          payrollReportId: report.id,
          employeeId: employee.id,
          baseSalaryFcfa: contract.baseSalaryFcfa,
          overtimeHours,
          overtimeAmountFcfa,
          bonusesFcfa,
          advancesDeductedFcfa,
          grossSalaryFcfa,
          employeeContributionsFcfa,
          incomeTaxFcfa,
          netSalaryFcfa,
          anomalyFlags,
        },
      });
    }

    const updated = await this.client.payrollReport.update({
      where: { id: report.id },
      data: { status: anyAnomaly ? PayrollReportStatus.ANOMALY_REVIEW : PayrollReportStatus.DRAFT },
    });
    return this.getReport(updated.id);
  }

  private async sumApprovedLeaveDays(employeeId: string, type: LeaveType, from: Date, to: Date) {
    const requests = await this.client.leaveRequest.findMany({
      where: { employeeId, type, status: LeaveRequestStatus.APPROVED, startDate: { lte: to }, endDate: { gte: from } },
    });
    return requests.reduce((s: number, r: any) => s + r.days, 0);
  }

  private async sumAdvances(personId: string, from: Date, to: Date) {
    const advances = await this.client.paymentTransaction.findMany({
      where: {
        personId,
        type: PaymentTransactionType.ADVANCE,
        status: PayoutStatus.SUCCESS,
        settledAt: { gte: from, lte: to },
      },
    });
    return advances.reduce((s: number, a: any) => s + a.amountFcfa, 0);
  }

  /**
   * "Détection d'anomalies de paie et anti-fraude" (section 7.3),
   * implemented as deterministic, explainable rules rather than an ML
   * model — each flag states exactly why it fired, per the acceptance
   * criteria ("chaque alerte explique la raison de la détection").
   */
  private async detectAnomalies(params: {
    employeeId: string;
    actualHours: number;
    netSalaryFcfa: number;
    year: number;
    month: number;
  }): Promise<Array<{ code: string; message: string; severity: string }>> {
    const flags: Array<{ code: string; message: string; severity: string }> = [];

    if (params.actualHours === 0) {
      flags.push({
        code: 'EMPLOYE_SANS_POINTAGE',
        message: "Aucun pointage enregistré sur la période malgré un statut actif — vérifier qu'il ne s'agit pas d'un compte fantôme.",
        severity: 'high',
      });
    }

    const previousMonth = params.month === 1 ? 12 : params.month - 1;
    const previousYear = params.month === 1 ? params.year - 1 : params.year;
    const previousReport = await this.client.payrollReport.findUnique({
      where: {
        tenantId_periodYear_periodMonth: { tenantId: requireTenantId(), periodYear: previousYear, periodMonth: previousMonth },
      },
    });
    if (previousReport) {
      const previousLine = await this.client.payslipLine.findUnique({
        where: { payrollReportId_employeeId: { payrollReportId: previousReport.id, employeeId: params.employeeId } },
      });
      if (previousLine && previousLine.netSalaryFcfa > 0) {
        const delta = Math.abs(params.netSalaryFcfa - previousLine.netSalaryFcfa) / previousLine.netSalaryFcfa;
        if (delta > 0.4) {
          flags.push({
            code: 'ECART_INHABITUEL',
            message: `Net à payer en écart de ${Math.round(delta * 100)}% par rapport au mois précédent (${previousLine.netSalaryFcfa} FCFA).`,
            severity: 'medium',
          });
        }
      }
    }

    return flags;
  }

  async getReport(id: string) {
    const report = await this.client.payrollReport.findUnique({
      where: { id },
      include: {
        lines: { include: { employee: { include: { person: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!report) throw new BadRequestException('Rapport de paie introuvable.');
    return report;
  }

  async listReports() {
    return this.client.payrollReport.findMany({ orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] });
  }

  async validate(id: string) {
    const before = await this.client.payrollReport.findUnique({ where: { id } });
    if (!before) throw new BadRequestException('Rapport de paie introuvable.');
    const report = await this.client.payrollReport.update({
      where: { id },
      data: { status: PayrollReportStatus.VALIDATED, validatedAt: new Date() },
    });
    await this.audit.log({ action: 'PAYROLL_VALIDATED', entityType: 'PayrollReport', entityId: id, before, after: report });
    return report;
  }

  /** "Export des variables de paie au format Excel/CSV paramétrable" (section 6.6). */
  async exportCsv(id: string): Promise<string> {
    const report = await this.getReport(id);
    const rows = report.lines.map((l: any) => ({
      matricule: l.employee.employeeNumber,
      nom: `${l.employee.person.firstName} ${l.employee.person.lastName}`,
      salaire_base: l.baseSalaryFcfa,
      heures_supplementaires: l.overtimeHours,
      montant_hs: l.overtimeAmountFcfa,
      primes: l.bonusesFcfa,
      acomptes_deduits: l.advancesDeductedFcfa,
      salaire_brut: l.grossSalaryFcfa,
      cotisations_salariales: l.employeeContributionsFcfa,
      impot_salaire: l.incomeTaxFcfa,
      salaire_net: l.netSalaryFcfa,
    }));
    await this.client.payrollReport.update({ where: { id }, data: { exportedAt: new Date(), status: PayrollReportStatus.EXPORTED } });
    return stringify(rows, { header: true });
  }

  /** "Distribution instantanée dans l'espace personnel ... et notification WhatsApp" (section 6.7). */
  async distribute(id: string) {
    const tenantId = requireTenantId();
    const report = await this.getReport(id);
    const companyName = await this.resolveCompanyName(tenantId);

    const payslips = [];
    for (const line of report.lines) {
      const html = renderPayslipHtml({
        companyName,
        employeeName: `${line.employee.person.firstName} ${line.employee.person.lastName}`,
        employeeNumber: line.employee.employeeNumber,
        position: line.employee.position,
        periodYear: report.periodYear,
        periodMonth: report.periodMonth,
        baseSalaryFcfa: line.baseSalaryFcfa,
        overtimeHours: line.overtimeHours,
        overtimeAmountFcfa: line.overtimeAmountFcfa,
        bonusesFcfa: line.bonusesFcfa,
        advancesDeductedFcfa: line.advancesDeductedFcfa,
        grossSalaryFcfa: line.grossSalaryFcfa,
        employeeContributionsFcfa: line.employeeContributionsFcfa,
        incomeTaxFcfa: line.incomeTaxFcfa,
        netSalaryFcfa: line.netSalaryFcfa,
      });
      const relativePath = `${tenantId}/payslips/${line.employeeId}/${report.periodYear}-${String(report.periodMonth).padStart(2, '0')}.html`;
      await this.storage.save(relativePath, html);

      const payslip = await this.client.payslip.upsert({
        where: {
          employeeId_periodYear_periodMonth: {
            employeeId: line.employeeId,
            periodYear: report.periodYear,
            periodMonth: report.periodMonth,
          },
        },
        update: { fileUrl: relativePath, distributedAt: new Date() },
        create: {
          employeeId: line.employeeId,
          periodYear: report.periodYear,
          periodMonth: report.periodMonth,
          fileUrl: relativePath,
        },
      });
      payslips.push(payslip);

      await this.notifications.send({
        personId: line.employee.personId,
        template: 'PAYSLIP_AVAILABLE',
        payload: { periodYear: report.periodYear, periodMonth: report.periodMonth },
      });
    }

    await this.audit.log({
      action: 'PAYSLIPS_DISTRIBUTED',
      entityType: 'PayrollReport',
      entityId: id,
      after: { count: payslips.length },
    });

    return { distributedCount: payslips.length };
  }

  // Tenant is intentionally excluded from tenant-scoped auto-injection (it
  // IS the tenant), so `.tenant.findUnique` on the scoped client passes
  // straight through unscoped — filtering explicitly by id here is safe
  // and sufficient.
  private async resolveCompanyName(tenantId: string): Promise<string> {
    const row = await (this.tenantPrisma.client as any).tenant.findUnique({ where: { id: tenantId } });
    return row?.name ?? 'Entreprise';
  }

  /** "Versement des salaires ... par mobile money" + réconciliation (section 6.8). */
  async payViaMobileMoney(id: string, provider: PayoutProvider = PayoutProvider.WAVE, initiatedBy: string) {
    const report = await this.getReport(id);
    const lines = report.lines.map((l: any) => ({
      personId: l.employee.personId,
      amountFcfa: l.netSalaryFcfa,
      mobileMoneyNumber: l.employee.person.mobileMoneyNumber,
    }));
    const batch = await this.payouts.runBulkPayout({
      type: PaymentTransactionType.SALARY,
      provider,
      initiatedBy,
      lines,
    });
    await this.client.payrollReport.update({ where: { id }, data: { status: PayrollReportStatus.PAID } });
    await this.audit.log({
      action: 'PAYROLL_PAID',
      entityType: 'PayrollReport',
      entityId: id,
      after: { batchId: batch.id, totalAmountFcfa: batch.totalAmountFcfa, status: batch.status },
    });
    return batch;
  }

  async grantAdvance(employeeId: string, amountFcfa: number, initiatedBy: string, provider: PayoutProvider = PayoutProvider.WAVE) {
    const employee = await this.client.employee.findUnique({ where: { id: employeeId }, include: { person: true } });
    if (!employee) throw new BadRequestException('Employé introuvable.');
    const batch = await this.payouts.runBulkPayout({
      type: PaymentTransactionType.ADVANCE,
      provider,
      initiatedBy,
      lines: [{ personId: employee.personId, amountFcfa, mobileMoneyNumber: employee.person.mobileMoneyNumber }],
    });
    await this.audit.log({
      action: 'ADVANCE_GRANTED',
      entityType: 'Employee',
      entityId: employeeId,
      after: { amountFcfa, batchId: batch.id },
    });
    return batch;
  }
}
