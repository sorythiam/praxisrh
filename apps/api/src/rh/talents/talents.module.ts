import { Module } from '@nestjs/common';
import { TalentsController } from './talents.controller';
import { TalentsService } from './talents.service';
import { CurrentEmployeeService } from '../common/current-employee.service';

@Module({
  controllers: [TalentsController],
  providers: [TalentsService, CurrentEmployeeService],
  exports: [TalentsService],
})
export class TalentsModule {}
