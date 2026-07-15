import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { IpmDashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.IPM)
@Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('ipm/dashboard')
export class IpmDashboardController {
  constructor(private dashboardService: IpmDashboardService) {}

  @Get('overview')
  overview() {
    return this.dashboardService.getOverview();
  }

  @Get('export/icamo')
  async exportIcamo(@Query('year') year: string, @Query('quarter') quarter: string, @Res() res: Response) {
    const csv = await this.dashboardService.exportIcamoReport(parseInt(year, 10), parseInt(quarter, 10));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="icamo-${year}-T${quarter}.csv"`);
    res.send(csv);
  }

  @Get('export/consolidated-payroll')
  async exportConsolidatedPayroll(@Query('year') year: string, @Query('month') month: string, @Res() res: Response) {
    const csv = await this.dashboardService.exportConsolidatedPayroll(parseInt(year, 10), parseInt(month, 10));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="paie-consolidee-${year}-${month}.csv"`);
    res.send(csv);
  }
}
