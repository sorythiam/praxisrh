import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { RecruitmentService } from './recruitment.service';
import { CreateApplicationDto, CreateJobPostingDto, HireApplicationDto, UpdateApplicationStageDto } from './dto/recruitment.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.RH)
@Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('rh/recruitment')
export class RecruitmentController {
  constructor(private recruitmentService: RecruitmentService) {}

  @Post('postings')
  createPosting(@Body() dto: CreateJobPostingDto) {
    return this.recruitmentService.createPosting(dto);
  }

  @Get('postings')
  listPostings() {
    return this.recruitmentService.listPostings();
  }

  @Get('postings/:id')
  getPosting(@Param('id') id: string) {
    return this.recruitmentService.getPosting(id);
  }

  @Patch('postings/:id/close')
  closePosting(@Param('id') id: string) {
    return this.recruitmentService.closePosting(id);
  }

  @Post('postings/:id/applications')
  createApplication(@Param('id') id: string, @Body() dto: CreateApplicationDto) {
    return this.recruitmentService.createApplication(id, dto);
  }

  @Get('postings/:id/applications')
  listApplications(@Param('id') id: string) {
    return this.recruitmentService.listApplications(id);
  }

  @Patch('applications/:id/stage')
  updateStage(@Param('id') id: string, @Body() dto: UpdateApplicationStageDto) {
    return this.recruitmentService.updateStage(id, dto.stage as any);
  }

  @Post('applications/:id/hire')
  hire(@Param('id') id: string, @Body() dto: HireApplicationDto) {
    return this.recruitmentService.hire(id, dto);
  }
}
