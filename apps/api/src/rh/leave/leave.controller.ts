import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto, DecisionDto } from './dto/leave-request.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Controller('rh/leave')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('my/balance')
  myBalance(@Query('year') year?: string) {
    return this.leaveService.getMyBalance(year ? parseInt(year, 10) : new Date().getFullYear());
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('my/requests')
  myRequests() {
    return this.leaveService.myRequests();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Post('requests')
  create(@Body() dto: CreateLeaveRequestDto) {
    return this.leaveService.createMyRequest(dto);
  }

  @Roles(Role.MANAGER)
  @Get('requests/pending-manager')
  pendingForManager(@Req() req: any) {
    return this.leaveService.pendingForManager(req.user.userId);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('requests/pending-hr')
  pendingForHr() {
    return this.leaveService.pendingForHr();
  }

  @Roles(Role.MANAGER)
  @Patch('requests/:id/manager-decision')
  managerDecision(@Param('id') id: string, @Body() dto: DecisionDto) {
    return this.leaveService.managerDecision(id, dto.approve, dto.reason);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch('requests/:id/hr-decision')
  hrDecision(@Param('id') id: string, @Body() dto: DecisionDto) {
    return this.leaveService.hrDecision(id, dto.approve, dto.reason);
  }

  @Roles(Role.MANAGER)
  @Get('calendar')
  calendar(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.leaveService.teamCalendar(req.user.userId, from, to);
  }
}
