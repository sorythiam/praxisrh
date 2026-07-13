import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { CurrentEmployeeService } from '../common/current-employee.service';
import { TimeclockModule } from '../timeclock/timeclock.module';

@Module({
  imports: [TimeclockModule],
  controllers: [PayrollController],
  providers: [PayrollService, CurrentEmployeeService],
  exports: [PayrollService],
})
export class PayrollModule {}
