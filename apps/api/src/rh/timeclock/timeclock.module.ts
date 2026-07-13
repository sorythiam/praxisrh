import { Module } from '@nestjs/common';
import { TimeclockController } from './timeclock.controller';
import { TimeclockService } from './timeclock.service';
import { CurrentEmployeeService } from '../common/current-employee.service';

@Module({
  controllers: [TimeclockController],
  providers: [TimeclockService, CurrentEmployeeService],
  exports: [TimeclockService],
})
export class TimeclockModule {}
