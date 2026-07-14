import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Controller('rh/employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get()
  findAll(@Query('status') status?: any, @Query('establishmentId') establishmentId?: string) {
    return this.employeesService.findAll({ status, establishmentId });
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('alerts')
  getAlerts() {
    return this.employeesService.getComplianceAlerts();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me/profile')
  getMyProfile() {
    return this.employeesService.getMyProfile();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Patch('me/profile')
  updateMyProfile(@Body() dto: UpdateProfileDto) {
    return this.employeesService.updateMyProfile(dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>) {
    return this.employeesService.update(id, dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.employeesService.activate(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id/offboard')
  offboard(@Param('id') id: string, @Body() body: { endDate: string }) {
    return this.employeesService.offboard(id, body.endDate);
  }
}
