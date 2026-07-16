import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { IncidentsService } from './incidents.service';
import { BlacklistEmployeeDto, LiftBlacklistDto, ReportIncidentDto } from './dto/incidents.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.INTERIM)
@Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('interim')
export class IncidentsController {
  constructor(private incidentsService: IncidentsService) {}

  @Post('incidents')
  reportIncident(@Body() dto: ReportIncidentDto) {
    return this.incidentsService.reportIncident(dto);
  }

  @Get('incidents')
  listIncidents(@Query('employeeId') employeeId?: string) {
    return this.incidentsService.listIncidents(employeeId);
  }

  @Post('blacklist')
  blacklist(@Body() dto: BlacklistEmployeeDto) {
    return this.incidentsService.blacklist(dto);
  }

  @Patch('blacklist/:employeeId/lift')
  liftBlacklist(@Param('employeeId') employeeId: string, @Body() dto: LiftBlacklistDto) {
    return this.incidentsService.liftBlacklist(employeeId, dto.liftedReason);
  }

  @Get('blacklist')
  listBlacklist() {
    return this.incidentsService.listBlacklist();
  }
}
