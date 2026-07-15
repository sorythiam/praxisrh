import { Module } from '@nestjs/common';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { ContributionsModule } from './contributions/contributions.module';
import { ProvidersModule } from './providers/providers.module';
import { ReimbursementsModule } from './reimbursements/reimbursements.module';
import { IpmDashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [BeneficiariesModule, ContributionsModule, ProvidersModule, ReimbursementsModule, IpmDashboardModule],
})
export class IpmModule {}
