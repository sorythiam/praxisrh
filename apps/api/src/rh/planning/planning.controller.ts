import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { PlanningService } from './planning.service';
import { BulkCreateShiftsDto, CreateShiftDto, PublishShiftsDto } from './dto/shift.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Controller('rh/planning')
export class PlanningController {
  constructor(private planningService: PlanningService) {}

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('my')
  myShifts(@Query('from') from: string, @Query('to') to: string) {
    return this.planningService.myShifts(from, to);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get()
  list(
    @Query('establishmentId') establishmentId: string | undefined,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.planningService.listByRange({ establishmentId, from, to });
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Post('shifts')
  create(@Body() dto: CreateShiftDto) {
    return this.planningService.createShift(dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Post('shifts/bulk')
  bulkCreate(@Body() dto: BulkCreateShiftsDto) {
    return this.planningService.bulkCreate(dto.shifts);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Post('duplicate-week')
  duplicateWeek(
    @Body() body: { establishmentId?: string; weekStart: string; weeksAhead: number },
  ) {
    return this.planningService.duplicateWeek(body.establishmentId, body.weekStart, body.weeksAhead);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Post('publish')
  publish(@Body() dto: PublishShiftsDto) {
    return this.planningService.publish(dto.shiftIds);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Delete('shifts/:id')
  remove(@Param('id') id: string) {
    return this.planningService.remove(id);
  }
}
