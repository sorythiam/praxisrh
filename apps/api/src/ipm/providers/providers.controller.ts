import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { ProvidersService } from './providers.service';
import { AddTariffDto, CreateProviderDto } from './dto/providers.dto';

/**
 * NOTE: there is no separate "prestataire" account/role in this build —
 * the eligibility check below is exposed to IPM_MANAGER, who checks it
 * on the beneficiary's behalf (e.g. over the phone with the provider) or
 * from a shared terminal. A dedicated provider-portal login (its own
 * Role, its own auth flow) is the natural next increment for section
 * 8.3's "en tant que prestataire, je veux scanner..." user story, kept
 * out of this pass to avoid growing the auth model without a concrete
 * external-provider onboarding flow to test it against.
 */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.IPM)
@Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('ipm/providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Post()
  createProvider(@Body() dto: CreateProviderDto) {
    return this.providersService.createProvider(dto);
  }

  @Get()
  listProviders() {
    return this.providersService.listProviders();
  }

  @Get(':id')
  getProvider(@Param('id') id: string) {
    return this.providersService.getProvider(id);
  }

  @Post(':id/tariffs')
  addTariff(@Param('id') id: string, @Body() dto: AddTariffDto) {
    return this.providersService.addTariff(id, dto);
  }

  @Get('eligibility/:cardNumber')
  checkEligibility(@Param('cardNumber') cardNumber: string) {
    return this.providersService.checkEligibility(cardNumber);
  }
}
