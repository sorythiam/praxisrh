import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { BillingService } from './billing.service';
import { GenerateProformaDto } from './dto/billing.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.INTERIM)
@Roles(Role.INTERIM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('interim/billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('proforma')
  generate(@Body() dto: GenerateProformaDto) {
    return this.billingService.generateProforma(dto);
  }

  @Get('proforma')
  list(@Query('missionId') missionId?: string) {
    return missionId ? this.billingService.listForMission(missionId) : this.billingService.list();
  }

  @Get('proforma/:id')
  get(@Param('id') id: string) {
    return this.billingService.get(id);
  }

  @Patch('proforma/:id/sent')
  markSent(@Param('id') id: string) {
    return this.billingService.markSent(id);
  }

  @Patch('proforma/:id/paid')
  markPaid(@Param('id') id: string) {
    return this.billingService.markPaid(id);
  }
}
