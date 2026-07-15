import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import { IpmCaseStatus } from '@prisma/client';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';

@Injectable()
export class IpmDashboardService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /** "Ratio cotisations/prestations en temps réel, top postes de dépense" (section 8.6). */
  async getOverview() {
    const yearStart = new Date(Date.UTC(new Date().getFullYear(), 0, 1));

    const [contributions, cases, beneficiaryCount] = await Promise.all([
      this.client.ipmContribution.findMany({ where: { createdAt: { gte: yearStart } } }),
      this.client.ipmReimbursementCase.findMany({
        where: { status: { in: [IpmCaseStatus.APPROVED, IpmCaseStatus.PAID] }, createdAt: { gte: yearStart } },
      }),
      this.client.ipmBeneficiary.count({ where: { cardStatus: 'ACTIVE' } }),
    ]);

    const totalContributionsFcfa = contributions.reduce(
      (s: number, c: any) => s + c.employerShareFcfa + c.employeeShareFcfa,
      0,
    );
    const totalPrestationsFcfa = cases.reduce((s: number, c: any) => s + (c.amountApprovedFcfa ?? 0), 0);

    const byCategory = new Map<string, number>();
    for (const c of cases) {
      byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + (c.amountApprovedFcfa ?? 0));
    }
    const topCategories = [...byCategory.entries()]
      .map(([category, amountFcfa]) => ({ category, amountFcfa }))
      .sort((a, b) => b.amountFcfa - a.amountFcfa);

    return {
      activeBeneficiaries: beneficiaryCount,
      totalContributionsFcfa,
      totalPrestationsFcfa,
      sinistraliteRatio: totalContributionsFcfa > 0 ? Math.round((totalPrestationsFcfa / totalContributionsFcfa) * 1000) / 10 : null,
      topCategories,
      pendingCasesCount: await this.client.ipmReimbursementCase.count({
        where: { status: { in: [IpmCaseStatus.SUBMITTED, IpmCaseStatus.PENDING_MEDICAL_REVIEW] } },
      }),
    };
  }

  /**
   * "Exports réglementaires au format ICAMO" (8.6). No published ICAMO
   * file specification was available while building this — the columns
   * below are a reasonable, clearly-labelled representative export
   * (adhérents actifs, cotisations, prestations par période) rather than
   * a guessed byte-for-byte official format. Confirm the exact column
   * set/ordering with ICAMO before relying on this for a real filing.
   */
  async exportIcamoReport(year: number, quarter: number): Promise<string> {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;

    const contributions = await this.client.ipmContribution.findMany({
      where: { periodYear: year, periodMonth: { gte: startMonth, lte: endMonth } },
      include: { beneficiary: { include: { employee: { include: { person: true } } } } },
    });
    const cases = await this.client.ipmReimbursementCase.findMany({
      where: {
        status: { in: [IpmCaseStatus.APPROVED, IpmCaseStatus.PAID] },
        createdAt: {
          gte: new Date(Date.UTC(year, startMonth - 1, 1)),
          lte: new Date(Date.UTC(year, endMonth, 0, 23, 59, 59)),
        },
      },
      include: { beneficiary: { include: { employee: { include: { person: true } } } } },
    });

    const rows = [
      ...contributions.map((c: any) => ({
        type: 'COTISATION',
        matricule_adherent: c.beneficiary.employee.employeeNumber,
        nom: `${c.beneficiary.employee.person.firstName} ${c.beneficiary.employee.person.lastName}`,
        numero_carte: c.beneficiary.cardNumber,
        periode: `${c.periodYear}-${String(c.periodMonth).padStart(2, '0')}`,
        assiette_fcfa: c.assietteFcfa,
        montant_fcfa: c.employerShareFcfa + c.employeeShareFcfa,
        categorie: '',
      })),
      ...cases.map((c: any) => ({
        type: 'PRESTATION',
        matricule_adherent: c.beneficiary.employee.employeeNumber,
        nom: `${c.beneficiary.employee.person.firstName} ${c.beneficiary.employee.person.lastName}`,
        numero_carte: c.beneficiary.cardNumber,
        periode: new Date(c.createdAt).toISOString().slice(0, 7),
        assiette_fcfa: '',
        montant_fcfa: c.amountApprovedFcfa ?? 0,
        categorie: c.category,
      })),
    ];

    return stringify(rows, { header: true });
  }

  /**
   * "L'export vers le logiciel de paie combine, par employé, les
   * variables de paie de Praxis RH et la retenue salariale IPM ... un
   * seul fichier au lieu de deux à recouper manuellement" (section 10.4).
   */
  async exportConsolidatedPayroll(year: number, month: number): Promise<string> {
    const payrollReport = await this.client.payrollReport.findFirst({
      where: { periodYear: year, periodMonth: month },
      include: { lines: { include: { employee: { include: { person: true } } } } },
    });
    if (!payrollReport) return stringify([], { header: true });

    const contributions = await this.client.ipmContribution.findMany({ where: { periodYear: year, periodMonth: month } });
    const beneficiaries = await this.client.ipmBeneficiary.findMany({
      where: { id: { in: contributions.map((c: any) => c.beneficiaryId) } },
    });
    const employeeIdByBeneficiaryId = new Map<string, string>();
    for (const b of beneficiaries) {
      employeeIdByBeneficiaryId.set(b.id, b.employeeId);
    }
    const contributionByBeneficiaryEmployeeId = new Map<string, any>();
    for (const c of contributions) {
      const employeeId = employeeIdByBeneficiaryId.get(c.beneficiaryId);
      if (employeeId) contributionByBeneficiaryEmployeeId.set(employeeId, c);
    }

    const rows = payrollReport.lines.map((line: any) => {
      const ipmContribution = contributionByBeneficiaryEmployeeId.get(line.employeeId);
      const ipmRetenueFcfa = ipmContribution?.employeeShareFcfa ?? 0;
      return {
        matricule: line.employee.employeeNumber,
        nom: `${line.employee.person.firstName} ${line.employee.person.lastName}`,
        salaire_brut_fcfa: line.grossSalaryFcfa,
        cotisations_sociales_fcfa: line.employeeContributionsFcfa,
        impot_salaire_fcfa: line.incomeTaxFcfa,
        retenue_ipm_fcfa: ipmRetenueFcfa,
        salaire_net_fcfa: line.netSalaryFcfa - ipmRetenueFcfa,
      };
    });

    return stringify(rows, { header: true });
  }
}
