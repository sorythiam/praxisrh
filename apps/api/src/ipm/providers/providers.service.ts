import { BadRequestException, Injectable } from '@nestjs/common';
import { IpmCardStatus, IpmCaseStatus } from '@prisma/client';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { AddTariffDto, CreateProviderDto } from './dto/providers.dto';

@Injectable()
export class ProvidersService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private beneficiaries: BeneficiariesService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  createProvider(dto: CreateProviderDto) {
    return this.client.ipmProvider.create({ data: dto });
  }

  listProviders() {
    return this.client.ipmProvider.findMany({ include: { tariffs: true }, orderBy: { name: 'asc' } });
  }

  async getProvider(id: string) {
    const provider = await this.client.ipmProvider.findUnique({ where: { id }, include: { tariffs: true } });
    if (!provider) throw new BadRequestException('Prestataire introuvable.');
    return provider;
  }

  addTariff(providerId: string, dto: AddTariffDto) {
    return this.client.ipmTariff.create({ data: { providerId, ...dto } });
  }

  /**
   * "Vérification d'éligibilité en temps réel par scan du QR code
   * (statut, taux de couverture, plafond restant)" — section 8.3, with
   * a <3s response time acceptance criterion. This is a handful of
   * indexed lookups, so it comfortably clears that without any caching.
   */
  async checkEligibility(cardNumber: string) {
    const beneficiary = await this.beneficiaries.getByCardNumber(cardNumber);

    const isEligible = beneficiary.effectiveCardStatus === IpmCardStatus.ACTIVE;

    const caps = await this.client.ipmAnnualCap.findMany();
    const yearStart = new Date(Date.UTC(new Date().getFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(new Date().getFullYear(), 11, 31, 23, 59, 59));

    const plafondsByCategory = await Promise.all(
      caps.map(async (cap: any) => {
        const consumed = await this.client.ipmReimbursementCase.aggregate({
          where: {
            beneficiaryId: beneficiary.id,
            category: cap.category,
            status: { in: [IpmCaseStatus.APPROVED, IpmCaseStatus.PAID] },
            createdAt: { gte: yearStart, lte: yearEnd },
          },
          _sum: { amountApprovedFcfa: true },
        });
        const consumedFcfa = consumed._sum.amountApprovedFcfa ?? 0;
        return {
          category: cap.category,
          annualCapFcfa: cap.annualCapFcfa,
          consumedFcfa,
          remainingFcfa: Math.max(0, cap.annualCapFcfa - consumedFcfa),
        };
      }),
    );

    return {
      cardNumber: beneficiary.cardNumber,
      beneficiaryName: `${beneficiary.employee.person.firstName} ${beneficiary.employee.person.lastName}`,
      isEligible,
      effectiveCardStatus: beneficiary.effectiveCardStatus,
      coverageRatePercent: beneficiary.coverageRatePercent,
      plafondsByCategory,
    };
  }
}
