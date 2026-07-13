import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { RhDashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('rh/dashboard')
export class RhDashboardController {
  constructor(private dashboardService: RhDashboardService) {}

  @Get('overview')
  overview() {
    return this.dashboardService.getOverview();
  }

  @Get('payroll-ratio')
  payrollRatio(
    @Query('revenueFcfa') revenueFcfa: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.dashboardService.computePayrollToRevenueRatio(
      parseInt(revenueFcfa, 10),
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }
}
