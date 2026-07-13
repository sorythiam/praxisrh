import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { StorageService } from '../../core/storage/storage.service';
import { CurrentEmployeeService } from '../common/current-employee.service';
import { PayrollService } from './payroll.service';
import { GeneratePayrollDto, GrantAdvanceDto, PayReportDto } from './dto/payroll.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Controller('rh/payroll')
export class PayrollController {
  constructor(
    private payrollService: PayrollService,
    private currentEmployee: CurrentEmployeeService,
    private tenantPrisma: TenantPrismaService,
    private storage: StorageService,
  ) {}

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('generate')
  generate(@Body() dto: GeneratePayrollDto) {
    return this.payrollService.generate(dto.year, dto.month);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('reports')
  list() {
    return this.payrollService.listReports();
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('reports/:id')
  getReport(@Param('id') id: string) {
    return this.payrollService.getReport(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('reports/:id/validate')
  validate(@Param('id') id: string) {
    return this.payrollService.validate(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('reports/:id/export')
  async exportCsv(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.payrollService.exportCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="paie-${id}.csv"`);
    res.send(csv);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('reports/:id/distribute')
  distribute(@Param('id') id: string) {
    return this.payrollService.distribute(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('reports/:id/pay')
  pay(@Param('id') id: string, @Body() dto: PayReportDto, @Req() req: any) {
    return this.payrollService.payViaMobileMoney(id, dto.provider, req.user.userId);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('advances')
  grantAdvance(@Body() dto: GrantAdvanceDto, @Req() req: any) {
    return this.payrollService.grantAdvance(dto.employeeId, dto.amountFcfa, req.user.userId);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('my/payslips')
  async myPayslips() {
    const employee = await this.currentEmployee.resolve();
    return (this.tenantPrisma.client as any).payslip.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('my/payslips/:year/:month/download')
  async downloadMyPayslip(@Param('year') year: string, @Param('month') month: string, @Res() res: Response) {
    const employee = await this.currentEmployee.resolve();
    const payslip = await (this.tenantPrisma.client as any).payslip.findUnique({
      where: {
        employeeId_periodYear_periodMonth: {
          employeeId: employee.id,
          periodYear: parseInt(year, 10),
          periodMonth: parseInt(month, 10),
        },
      },
    });
    if (!payslip) {
      res.status(404).send('Bulletin introuvable.');
      return;
    }
    if (!payslip.firstViewedAt) {
      await (this.tenantPrisma.client as any).payslip.update({
        where: { id: payslip.id },
        data: { firstViewedAt: new Date() },
      });
    }
    const content = await this.storage.read(payslip.fileUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('payslips/:employeeId/:year/:month/download')
  async downloadEmployeePayslip(
    @Param('employeeId') employeeId: string,
    @Param('year') year: string,
    @Param('month') month: string,
    @Res() res: Response,
  ) {
    const payslip = await (this.tenantPrisma.client as any).payslip.findUnique({
      where: {
        employeeId_periodYear_periodMonth: {
          employeeId,
          periodYear: parseInt(year, 10),
          periodMonth: parseInt(month, 10),
        },
      },
    });
    if (!payslip) {
      res.status(404).send('Bulletin introuvable.');
      return;
    }
    const content = await this.storage.read(payslip.fileUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  }
}
