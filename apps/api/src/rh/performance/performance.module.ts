import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { CurrentEmployeeService } from '../common/current-employee.service';
import { TalentsModule } from '../talents/talents.module';

@Module({
  imports: [TalentsModule],
  controllers: [PerformanceController],
  providers: [PerformanceService, CurrentEmployeeService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
