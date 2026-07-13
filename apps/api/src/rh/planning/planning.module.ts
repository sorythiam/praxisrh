import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { CurrentEmployeeService } from '../common/current-employee.service';

@Module({
  controllers: [PlanningController],
  providers: [PlanningService, CurrentEmployeeService],
  exports: [PlanningService],
})
export class PlanningModule {}
