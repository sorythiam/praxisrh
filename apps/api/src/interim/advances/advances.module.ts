import { Module } from '@nestjs/common';
import { AdvancesController } from './advances.controller';
import { AdvancesService } from './advances.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';

@Module({
  controllers: [AdvancesController],
  providers: [AdvancesService, CurrentEmployeeService],
  exports: [AdvancesService],
})
export class AdvancesModule {}
