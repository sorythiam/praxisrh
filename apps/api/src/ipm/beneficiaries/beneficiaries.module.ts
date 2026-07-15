import { Module } from '@nestjs/common';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';

@Module({
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService, CurrentEmployeeService],
  exports: [BeneficiariesService],
})
export class BeneficiariesModule {}
