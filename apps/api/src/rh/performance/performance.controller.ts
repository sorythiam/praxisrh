import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { PerformanceService } from './performance.service';
import {
  CalibrateReviewDto,
  CreateFeedbackDto,
  CreateKeyResultDto,
  CreateObjectiveDto,
  CreateReviewCycleDto,
  UpdateKeyResultDto,
  UpdateObjectiveDto,
  UpsertReviewDto,
} from './dto/performance.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Controller('rh/performance')
export class PerformanceController {
  constructor(private performanceService: PerformanceService) {}

  // -- Objectives (OKR) --

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Post('objectives')
  createObjective(@Body() dto: CreateObjectiveDto) {
    return this.performanceService.createObjective(dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get('objectives')
  listObjectives(@Query('employeeId') employeeId?: string, @Query('periodLabel') periodLabel?: string) {
    return this.performanceService.listObjectives({ employeeId, periodLabel });
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me/objectives')
  myObjectives(@Query('periodLabel') periodLabel?: string) {
    return this.performanceService.getMyObjectives(periodLabel);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Patch('objectives/:id')
  updateObjective(@Param('id') id: string, @Body() dto: UpdateObjectiveDto) {
    return this.performanceService.updateObjective(id, dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Post('objectives/:id/key-results')
  addKeyResult(@Param('id') id: string, @Body() dto: CreateKeyResultDto) {
    return this.performanceService.addKeyResult(id, dto);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch('key-results/:id')
  updateKeyResult(@Param('id') id: string, @Body() dto: UpdateKeyResultDto) {
    return this.performanceService.updateKeyResult(id, dto);
  }

  // -- Continuous feedback --

  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('feedback')
  giveFeedback(@Body() dto: CreateFeedbackDto) {
    return this.performanceService.giveFeedback(dto);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me/feedback')
  myFeedback() {
    return this.performanceService.getMyFeedback();
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get('employees/:employeeId/feedback')
  employeeFeedback(@Param('employeeId') employeeId: string) {
    return this.performanceService.getEmployeeFeedback(employeeId);
  }

  // -- Review cycles & calibration --

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('review-cycles')
  createReviewCycle(@Body() dto: CreateReviewCycleDto) {
    return this.performanceService.createReviewCycle(dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get('review-cycles')
  listReviewCycles() {
    return this.performanceService.listReviewCycles();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me/reviews')
  myReviews() {
    return this.performanceService.getMyReviews();
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Get('review-cycles/:id/reviews')
  listReviewsForCycle(@Param('id') id: string) {
    return this.performanceService.listReviewsForCycle(id);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @Post('review-cycles/:id/reviews')
  upsertReview(@Param('id') id: string, @Body() dto: UpsertReviewDto) {
    return this.performanceService.upsertReview(id, dto);
  }

  @Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch('reviews/:id/calibrate')
  calibrateReview(@Param('id') id: string, @Body() dto: CalibrateReviewDto) {
    return this.performanceService.calibrateReview(id, dto);
  }
}
