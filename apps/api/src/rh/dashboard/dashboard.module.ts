import { Module } from '@nestjs/common';
import { RhDashboardController } from './dashboard.controller';
import { RhDashboardService } from './dashboard.service';

@Module({
  controllers: [RhDashboardController],
  providers: [RhDashboardService],
})
export class RhDashboardModule {}
