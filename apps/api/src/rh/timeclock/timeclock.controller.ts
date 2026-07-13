import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { TimeclockService } from './timeclock.service';
import { SyncClockEventsDto } from './dto/clock-event.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Controller('rh/timeclock')
export class TimeclockController {
  constructor(private timeclockService: TimeclockService) {}

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Post('sync')
  sync(@Body() dto: SyncClockEventsDto) {
    return this.timeclockService.syncMyEvents(dto.events);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('my')
  myEvents(@Query('limit') limit?: string) {
    return this.timeclockService.myRecentEvents(limit ? parseInt(limit, 10) : undefined);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get('variance')
  variance(
    @Query('employeeId') employeeId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.timeclockService.computeActualVsPlannedHours(employeeId, new Date(from), new Date(to));
  }
}
