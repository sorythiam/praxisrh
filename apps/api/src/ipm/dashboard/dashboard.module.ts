import { Module } from '@nestjs/common';
import { IpmDashboardController } from './dashboard.controller';
import { IpmDashboardService } from './dashboard.service';

@Module({
  controllers: [IpmDashboardController],
  providers: [IpmDashboardService],
})
export class IpmDashboardModule {}
