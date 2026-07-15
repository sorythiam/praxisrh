import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { ContributionsService } from './contributions.service';
import { GenerateContributionsDto } from './dto/contributions.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.IPM)
@Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('ipm/contributions')
export class ContributionsController {
  constructor(private contributionsService: ContributionsService) {}

  @Post('generate')
  generate(@Body() dto: GenerateContributionsDto) {
    return this.contributionsService.generate(dto.year, dto.month, dto.ratePercent, dto.employerSharePercent);
  }

  @Get('overdue')
  listOverdue() {
    return this.contributionsService.listOverdue();
  }

  @Get()
  listByPeriod(@Query('year') year: string, @Query('month') month: string) {
    return this.contributionsService.listByPeriod(parseInt(year, 10), parseInt(month, 10));
  }

  @Get('beneficiaries/:beneficiaryId')
  getBeneficiaryContributions(@Param('beneficiaryId') beneficiaryId: string) {
    return this.contributionsService.getBeneficiaryContributions(beneficiaryId);
  }

  @Patch(':id/mark-paid')
  markPaid(@Param('id') id: string) {
    return this.contributionsService.markPaid(id);
  }
}
