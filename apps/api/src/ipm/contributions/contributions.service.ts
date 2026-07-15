import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { requireTenantId } from '../../core/tenancy/tenant-context';
import { ASSIETTE_PLAFOND_FCFA } from './dto/contributions.dto';

const DEFAULT_RATE_PERCENT = 10;
const DEFAULT_EMPLOYER_SHARE_PERCENT = 66.67;

@Injectable()
export class ContributionsService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /**
   * "L'assiette de cotisation IPM alimentée par la paie réelle" (10.1):
   * reads that period's PayslipLine.grossSalaryFcfa directly from the RH
   * payroll — no manually entered base salary. Beneficiaries whose payroll
   * for the period hasn't been generated yet are skipped (surfaced back
   * to the caller) rather than silently defaulting to their contract's
   * base salary, since that would quietly bypass the "real payroll" rule.
   */
  async generate(year: number, month: number, ratePercent = DEFAULT_RATE_PERCENT, employerSharePercent = DEFAULT_EMPLOYER_SHARE_PERCENT) {
    const beneficiaries = await this.client.ipmBeneficiary.findMany({ where: { cardStatus: 'ACTIVE' } });
    const payrollReport = await this.client.payrollReport.findUnique({
      where: { tenantId_periodYear_periodMonth: { tenantId: requireTenantId(), periodYear: year, periodMonth: month } },
    });

    const created = [];
    const skipped: string[] = [];

    for (const beneficiary of beneficiaries) {
      const payslipLine = payrollReport
        ? await this.client.payslipLine.findUnique({
            where: { payrollReportId_employeeId: { payrollReportId: payrollReport.id, employeeId: beneficiary.employeeId } },
          })
        : null;

      if (!payslipLine) {
        skipped.push(beneficiary.id);
        continue;
      }

      const grossSalaryFcfa = payslipLine.grossSalaryFcfa;
      const assietteFcfa = Math.min(grossSalaryFcfa, ASSIETTE_PLAFOND_FCFA);
      const totalContributionFcfa = Math.round(assietteFcfa * (ratePercent / 100));
      const employerShareFcfa = Math.round(totalContributionFcfa * (employerSharePercent / 100));
      const employeeShareFcfa = totalContributionFcfa - employerShareFcfa;

      const contribution = await this.client.ipmContribution.upsert({
        where: { beneficiaryId_periodYear_periodMonth: { beneficiaryId: beneficiary.id, periodYear: year, periodMonth: month } },
        update: { grossSalaryFcfa, assietteFcfa, ratePercent, employerShareFcfa, employeeShareFcfa },
        create: {
          beneficiaryId: beneficiary.id,
          periodYear: year,
          periodMonth: month,
          grossSalaryFcfa,
          assietteFcfa,
          ratePercent,
          employerShareFcfa,
          employeeShareFcfa,
        },
      });
      created.push(contribution);
    }

    return { generated: created.length, skippedNoPayroll: skipped.length, contributions: created };
  }

  listByPeriod(year: number, month: number) {
    return this.client.ipmContribution.findMany({
      where: { periodYear: year, periodMonth: month },
      include: { beneficiary: { include: { employee: { include: { person: true } } } } },
    });
  }

  getBeneficiaryContributions(beneficiaryId: string) {
    return this.client.ipmContribution.findMany({
      where: { beneficiaryId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  markPaid(id: string) {
    return this.client.ipmContribution.update({ where: { id }, data: { status: 'PAID' } });
  }

  /** "Voir en un coup d'œil les [cotisations] en retard" (8.2 user story). */
  async listOverdue() {
    const now = new Date();
    const contributions = await this.client.ipmContribution.findMany({
      where: { status: 'DUE' },
      include: { beneficiary: { include: { employee: { include: { person: true } } } } },
    });
    return contributions.filter((c: any) => {
      const periodEnd = new Date(Date.UTC(c.periodYear, c.periodMonth, 0));
      return periodEnd < now;
    });
  }
}
