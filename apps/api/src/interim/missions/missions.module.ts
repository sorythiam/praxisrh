import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';

@Module({
  controllers: [MissionsController],
  providers: [MissionsService, CurrentEmployeeService],
  exports: [MissionsService],
})
export class MissionsModule {}
