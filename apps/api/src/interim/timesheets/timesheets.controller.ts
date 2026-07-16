import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterimTimesheetStatus } from '@prisma/client';
import { ModuleCode, Role } from '@praxis/shared';
import { ModuleGuard } from '../../core/auth/module.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { TimesheetsService } from './timesheets.service';
import { SubmitTimesheetDto } from './dto/timesheets.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.INTERIM)
@Controller('interim/timesheets')
export class TimesheetsController {
  constructor(private timesheetsService: TimesheetsService) {}

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Post('me')
  submitMyTimesheet(@Body() dto: SubmitTimesheetDto) {
    return this.timesheetsService.submitMyTimesheet(dto);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me')
  myTimesheets() {
    return this.timesheetsService.getMyTimesheets();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Post(':id/selfie')
  @UseInterceptors(FileInterceptor('file'))
  uploadSelfie(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.timesheetsService.uploadSelfie(id, file.originalname, file.buffer);
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get()
  list(
    @Query('missionId') missionId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('status') status?: InterimTimesheetStatus,
  ) {
    return this.timesheetsService.list({ missionId, assignmentId, status });
  }

  @Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.timesheetsService.get(id);
  }
}
