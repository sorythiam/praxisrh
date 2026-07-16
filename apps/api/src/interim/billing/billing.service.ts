import { BadRequestException, Injectable } from '@nestjs/common';
import { InterimInvoiceStatus, InterimTimesheetStatus } from '@prisma/client';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { GenerateProformaDto } from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /**
   * "Factures proforma" (9.5): totals only APPROVED timesheets (client
   * has confirmed the hours through the validation extranet) so a
   * proforma never bills for hours the client hasn't signed off on.
   */
  async generateProforma(dto: GenerateProformaDto) {
    const mission = await this.client.interimMission.findUnique({ where: { id: dto.missionId } });
    if (!mission) throw new BadRequestException('Mission introuvable.');

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const timesheets = await this.client.interimTimesheet.findMany({
      where: {
        status: InterimTimesheetStatus.APPROVED,
        date: { gte: periodStart, lte: periodEnd },
        assignment: { missionId: dto.missionId },
      },
    });

    const totalHours = timesheets.reduce((s: number, t: any) => s + t.hours, 0);
    const totalAmountFcfa = Math.round(totalHours * mission.billingRateFcfaPerHour);

    const invoice = await this.client.interimProformaInvoice.create({
      data: { missionId: dto.missionId, periodStart, periodEnd, totalHours, totalAmountFcfa },
    });
    await this.audit.log({ action: 'INTERIM_PROFORMA_GENERATED', entityType: 'InterimProformaInvoice', entityId: invoice.id, after: invoice });
    return invoice;
  }

  listForMission(missionId: string) {
    return this.client.interimProformaInvoice.findMany({ where: { missionId }, orderBy: { generatedAt: 'desc' } });
  }

  list() {
    return this.client.interimProformaInvoice.findMany({
      include: { mission: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async get(id: string) {
    const invoice = await this.client.interimProformaInvoice.findUnique({ where: { id }, include: { mission: true } });
    if (!invoice) throw new BadRequestException('Facture introuvable.');
    return invoice;
  }

  async markSent(id: string) {
    return this.updateStatus(id, InterimInvoiceStatus.SENT);
  }

  async markPaid(id: string) {
    return this.updateStatus(id, InterimInvoiceStatus.PAID);
  }

  private async updateStatus(id: string, status: InterimInvoiceStatus) {
    const before = await this.get(id);
    const invoice = await this.client.interimProformaInvoice.update({ where: { id }, data: { status } });
    await this.audit.log({ action: `INTERIM_PROFORMA_${status}`, entityType: 'InterimProformaInvoice', entityId: id, before, after: invoice });
    return invoice;
  }
}
