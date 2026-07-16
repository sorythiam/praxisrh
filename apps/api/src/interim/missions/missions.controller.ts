import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { MissionsService } from './missions.service';
import { CreateAssignmentDto, CreateMissionDto } from './dto/missions.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.INTERIM)
@Controller('interim/missions')
export class MissionsController {
  constructor(private missionsService: MissionsService) {}

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post()
  create(@Body() dto: CreateMissionDto) {
    return this.missionsService.createMission(dto);
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get()
  list() {
    return this.missionsService.list();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me')
  myAssignments() {
    return this.missionsService.getMyAssignments();
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.missionsService.get(id);
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.missionsService.close(id);
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post(':id/assignments')
  createAssignment(@Param('id') id: string, @Body() dto: CreateAssignmentDto) {
    return this.missionsService.createAssignment(id, dto);
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get(':id/assignments')
  listAssignments(@Param('id') id: string) {
    return this.missionsService.listAssignments(id);
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch('assignments/:assignmentId/end')
  endAssignment(@Param('assignmentId') assignmentId: string) {
    return this.missionsService.endAssignment(assignmentId);
  }
}
