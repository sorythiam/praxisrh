import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { requireTenantId } from '../../core/tenancy/tenant-context';

@Injectable()
export class RhDashboardService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /** "Tableau de bord DRH" (section 6.11). */
  async getOverview() {
    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [total, active, onboarding, offboarded, allEmployees, lastPayrollReport] = await Promise.all([
      this.client.employee.count(),
      this.client.employee.count({ where: { status: 'ACTIVE' } }),
      this.client.employee.count({ where: { status: 'ONBOARDING' } }),
      this.client.employee.count({ where: { status: { in: ['OFFBOARDING', 'TERMINATED'] }, endDate: { gte: yearAgo } } }),
      this.client.employee.findMany({ include: { person: true } }),
      this.client.payrollReport.findFirst({
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        include: { lines: true },
      }),
    ]);

    const turnoverRate = total > 0 ? Math.round((offboarded / total) * 1000) / 10 : 0;

    const now2 = new Date();
    const ageBuckets = { '<25': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0, inconnu: 0 };
    let genderKnownCount = 0;
    for (const e of allEmployees) {
      if (!e.person.dateOfBirth) {
        ageBuckets.inconnu++;
        continue;
      }
      const age = now2.getFullYear() - new Date(e.person.dateOfBirth).getFullYear();
      if (age < 25) ageBuckets['<25']++;
      else if (age < 35) ageBuckets['25-34']++;
      else if (age < 45) ageBuckets['35-44']++;
      else if (age < 55) ageBuckets['45-54']++;
      else ageBuckets['55+']++;
    }

    const massSalarialeFcfa = lastPayrollReport
      ? lastPayrollReport.lines.reduce((s: number, l: any) => s + l.grossSalaryFcfa, 0)
      : 0;

    return {
      headcount: { total, active, onboarding, offboardedLast12Months: offboarded },
      turnoverRate,
      ageBuckets,
      massSalarialeFcfa,
      lastPayrollPeriod: lastPayrollReport
        ? { year: lastPayrollReport.periodYear, month: lastPayrollReport.periodMonth }
        : null,
    };
  }

  /** Ratio masse salariale / CA, productivité horaire (section 6.9). Revenue is entered manually per period until a POS/accounting connector exists. */
  async computePayrollToRevenueRatio(revenueFcfa: number, periodYear: number, periodMonth: number) {
    const report = await this.client.payrollReport.findUnique({
      where: { tenantId_periodYear_periodMonth: { tenantId: requireTenantId(), periodYear, periodMonth } },
      include: { lines: true },
    });
    const massSalarialeFcfa = report ? report.lines.reduce((s: number, l: any) => s + l.grossSalaryFcfa, 0) : 0;
    return {
      massSalarialeFcfa,
      revenueFcfa,
      ratio: revenueFcfa > 0 ? Math.round((massSalarialeFcfa / revenueFcfa) * 1000) / 10 : null,
    };
  }
}
