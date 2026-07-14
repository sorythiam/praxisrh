import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CurrentEmployeeService } from '../common/current-employee.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, CurrentEmployeeService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
