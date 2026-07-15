import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { TalentsService } from './talents.service';
import {
  AddSuccessionCandidateDto,
  ApplyToPosteDto,
  CreateCompetenceDto,
  CreatePosteInterneDto,
  CreateSuccessionPlanDto,
  DecideApplicationDto,
  SetEmployeeCompetencesDto,
  UpsertDevelopmentPlanDto,
} from './dto/talents.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Controller('rh/talents')
export class TalentsController {
  constructor(private talentsService: TalentsService) {}

  // -- Competence catalogue --

  @Get('competences')
  listCompetences() {
    return this.talentsService.listCompetences();
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('competences')
  createCompetence(@Body() dto: CreateCompetenceDto) {
    return this.talentsService.createCompetence(dto);
  }

  // -- Self-service ("mon espace") --

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me/competences')
  myCompetences() {
    return this.talentsService.getMyCompetences();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me/development-plan')
  myDevelopmentPlan() {
    return this.talentsService.getMyDevelopmentPlan();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me/eligible-postes')
  myEligiblePostes() {
    return this.talentsService.getMyEligiblePostes();
  }

  // -- Employee skills mapping (HR/manager view) --

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get('employees/:employeeId/competences')
  employeeCompetences(@Param('employeeId') employeeId: string) {
    return this.talentsService.getEmployeeCompetences(employeeId);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Put('employees/:employeeId/competences')
  setEmployeeCompetences(@Param('employeeId') employeeId: string, @Body() dto: SetEmployeeCompetencesDto) {
    return this.talentsService.setEmployeeCompetences(employeeId, dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get('employees/:employeeId/development-plan')
  employeeDevelopmentPlan(@Param('employeeId') employeeId: string) {
    return this.talentsService.getEmployeeDevelopmentPlan(employeeId);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('employees/:employeeId/development-plan/suggest')
  suggestDevelopmentPlan(@Param('employeeId') employeeId: string) {
    return this.talentsService.suggestDevelopmentPlan(employeeId);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Put('employees/:employeeId/development-plan')
  upsertDevelopmentPlan(@Param('employeeId') employeeId: string, @Body() dto: UpsertDevelopmentPlanDto) {
    return this.talentsService.upsertDevelopmentPlan(employeeId, dto);
  }

  // -- Internal postings / mobility marketplace --

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('postes')
  createPoste(@Body() dto: CreatePosteInterneDto) {
    return this.talentsService.createPoste(dto);
  }

  @Get('postes')
  listPostes(@Query('onlyOpen') onlyOpen: string | undefined) {
    return this.talentsService.listPostes(onlyOpen === 'true');
  }

  @Get('postes/:id')
  getPoste(@Param('id') id: string) {
    return this.talentsService.getPoste(id);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Post('postes/:id/apply')
  applyToPoste(@Param('id') id: string, @Body() dto: ApplyToPosteDto) {
    return this.talentsService.applyToPoste(id, dto.message);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('postes/:id/applications')
  listApplications(@Param('id') id: string) {
    return this.talentsService.listApplications(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch('applications/:id')
  decideApplication(@Param('id') id: string, @Body() dto: DecideApplicationDto) {
    return this.talentsService.decideApplication(id, dto.status);
  }

  // -- Succession planning for key roles --

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('postes/:id/succession-plan')
  createSuccessionPlan(@Param('id') id: string, @Body() dto: CreateSuccessionPlanDto) {
    return this.talentsService.createSuccessionPlan(id, dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('postes/:id/succession-plan')
  getSuccessionPlan(@Param('id') id: string) {
    return this.talentsService.getSuccessionPlan(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('postes/:id/succession-suggestions')
  suggestSuccessionCandidates(@Param('id') id: string) {
    return this.talentsService.suggestSuccessionCandidates(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('succession-plans/:id/candidates')
  addSuccessionCandidate(@Param('id') id: string, @Body() dto: AddSuccessionCandidateDto) {
    return this.talentsService.addSuccessionCandidate(id, dto);
  }
}
