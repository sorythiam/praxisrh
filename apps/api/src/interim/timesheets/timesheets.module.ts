import { Module } from '@nestjs/common';
import { TimesheetsController } from './timesheets.controller';
import { ClientValidationController } from './client-validation.controller';
import { TimesheetsService } from './timesheets.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';

@Module({
  controllers: [TimesheetsController, ClientValidationController],
  providers: [TimesheetsService, CurrentEmployeeService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
