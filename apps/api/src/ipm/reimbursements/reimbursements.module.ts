import { Module } from '@nestjs/common';
import { ReimbursementsController } from './reimbursements.controller';
import { ReimbursementsService } from './reimbursements.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';

@Module({
  controllers: [ReimbursementsController],
  providers: [ReimbursementsService, CurrentEmployeeService],
  exports: [ReimbursementsService],
})
export class ReimbursementsModule {}
