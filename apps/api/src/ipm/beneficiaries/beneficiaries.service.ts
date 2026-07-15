import { BadRequestException, Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { IpmCardStatus } from '@prisma/client';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';
import { computeEffectiveCardStatus } from '../ipm-common';
import { ActivateBeneficiaryDto, AddDependentDto } from './dto/beneficiaries.dto';

const genCardSuffix = customAlphabet('0123456789', 8);

@Injectable()
export class BeneficiariesService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  private withEffectiveStatus(beneficiary: any) {
    return { ...beneficiary, effectiveCardStatus: computeEffectiveCardStatus(beneficiary) };
  }

  /** "Cycle de vie complet des entreprises adhérentes, salariés..." (8.1) — one beneficiary per employee, card issued immediately. */
  async activate(dto: ActivateBeneficiaryDto) {
    const existing = await this.client.ipmBeneficiary.findUnique({ where: { employeeId: dto.employeeId } });
    if (existing) {
      throw new BadRequestException('Cet employé est déjà adhérent IPM.');
    }
    const beneficiary = await this.client.ipmBeneficiary.create({
      data: {
        employeeId: dto.employeeId,
        cardNumber: `IPM-${genCardSuffix()}`,
        coverageRatePercent: dto.coverageRatePercent ?? 80,
      },
      include: { employee: { include: { person: true } } },
    });
    await this.audit.log({
      action: 'IPM_BENEFICIARY_ACTIVATED',
      entityType: 'IpmBeneficiary',
      entityId: beneficiary.id,
      after: beneficiary,
    });
    return this.withEffectiveStatus(beneficiary);
  }

  async list() {
    const beneficiaries = await this.client.ipmBeneficiary.findMany({
      include: { employee: { include: { person: true } }, dependents: true },
      orderBy: { createdAt: 'desc' },
    });
    return beneficiaries.map((b: any) => this.withEffectiveStatus(b));
  }

  async get(id: string) {
    const beneficiary = await this.client.ipmBeneficiary.findUnique({
      where: { id },
      include: { employee: { include: { person: true } }, dependents: true },
    });
    if (!beneficiary) throw new BadRequestException('Adhérent introuvable.');
    return this.withEffectiveStatus(beneficiary);
  }

  async getByCardNumber(cardNumber: string) {
    const beneficiary = await this.client.ipmBeneficiary.findFirst({
      where: { cardNumber },
      include: { employee: { include: { person: true } }, dependents: true },
    });
    if (!beneficiary) throw new BadRequestException('Numéro de carte introuvable.');
    return this.withEffectiveStatus(beneficiary);
  }

  async getMyBeneficiary() {
    const employee = await this.currentEmployee.resolve();
    const beneficiary = await this.client.ipmBeneficiary.findUnique({
      where: { employeeId: employee.id },
      include: { employee: { include: { person: true } }, dependents: true },
    });
    if (!beneficiary) throw new BadRequestException("Vous n'êtes pas adhérent IPM.");
    return this.withEffectiveStatus(beneficiary);
  }

  async addDependent(beneficiaryId: string, dto: AddDependentDto) {
    return this.client.ipmDependent.create({
      data: {
        beneficiaryId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        relationship: dto.relationship,
        cardNumber: `IPM-${genCardSuffix()}`,
      },
    });
  }

  listDependents(beneficiaryId: string) {
    return this.client.ipmDependent.findMany({ where: { beneficiaryId } });
  }

  /**
   * "Toute suspension désactive le QR code sous 24h" (8.1 acceptance
   * criteria) — this is the manual/explicit suspension path (a
   * gestionnaire acting directly); the employment-driven path is
   * computeEffectiveCardStatus, evaluated on every read instead of
   * pushed here, so it can never go stale.
   */
  async suspend(id: string, reason: string) {
    const before = await this.client.ipmBeneficiary.findUnique({ where: { id } });
    const beneficiary = await this.client.ipmBeneficiary.update({
      where: { id },
      data: { cardStatus: IpmCardStatus.SUSPENDED, suspendedAt: new Date(), suspensionReason: reason },
    });
    await this.audit.log({
      action: 'IPM_BENEFICIARY_SUSPENDED',
      entityType: 'IpmBeneficiary',
      entityId: id,
      before,
      after: beneficiary,
    });
    return beneficiary;
  }

  async reactivate(id: string) {
    const before = await this.client.ipmBeneficiary.findUnique({ where: { id } });
    const beneficiary = await this.client.ipmBeneficiary.update({
      where: { id },
      data: { cardStatus: IpmCardStatus.ACTIVE, suspendedAt: null, suspensionReason: null },
    });
    await this.audit.log({
      action: 'IPM_BENEFICIARY_REACTIVATED',
      entityType: 'IpmBeneficiary',
      entityId: id,
      before,
      after: beneficiary,
    });
    return beneficiary;
  }
}
