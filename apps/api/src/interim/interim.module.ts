import { Module } from '@nestjs/common';
import { MissionsModule } from './missions/missions.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { IncidentsModule } from './incidents/incidents.module';
import { AdvancesModule } from './advances/advances.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [MissionsModule, TimesheetsModule, IncidentsModule, AdvancesModule, BillingModule],
})
export class InterimModule {}
