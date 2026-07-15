import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { BeneficiariesService } from './beneficiaries.service';
import { ActivateBeneficiaryDto, AddDependentDto, SuspendBeneficiaryDto } from './dto/beneficiaries.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.IPM)
@Controller('ipm/beneficiaries')
export class BeneficiariesController {
  constructor(private beneficiariesService: BeneficiariesService) {}

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post()
  activate(@Body() dto: ActivateBeneficiaryDto) {
    return this.beneficiariesService.activate(dto);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get()
  list() {
    return this.beneficiariesService.list();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me')
  myBeneficiary() {
    return this.beneficiariesService.getMyBeneficiary();
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.beneficiariesService.get(id);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post(':id/dependents')
  addDependent(@Param('id') id: string, @Body() dto: AddDependentDto) {
    return this.beneficiariesService.addDependent(id, dto);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get(':id/dependents')
  listDependents(@Param('id') id: string) {
    return this.beneficiariesService.listDependents(id);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @Body() dto: SuspendBeneficiaryDto) {
    return this.beneficiariesService.suspend(id, dto.reason);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.beneficiariesService.reactivate(id);
  }
}
