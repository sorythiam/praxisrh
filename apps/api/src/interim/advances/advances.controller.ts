import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { AdvancesService } from './advances.service';
import { DecideAdvanceDto, RequestAdvanceDto } from './dto/advances.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.INTERIM)
@Controller('interim/advances')
export class AdvancesController {
  constructor(private advancesService: AdvancesService) {}

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Post('me')
  requestMyAdvance(@Body() dto: RequestAdvanceDto) {
    return this.advancesService.requestMyAdvance(dto);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me')
  myAdvances() {
    return this.advancesService.getMyAdvances();
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get()
  list() {
    return this.advancesService.list();
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id/decision')
  decide(@Param('id') id: string, @Body() dto: DecideAdvanceDto) {
    return this.advancesService.decide(id, dto.approve);
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post(':id/pay')
  pay(@Param('id') id: string) {
    return this.advancesService.pay(id);
  }
}
