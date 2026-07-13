import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { CurrentEmployeeService } from '../common/current-employee.service';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService, CurrentEmployeeService],
  exports: [LeaveService],
})
export class LeaveModule {}
