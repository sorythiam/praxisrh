import { Controller, Get, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../core/auth/jwt-auth.guard';
import { RolesGuard } from '../core/auth/roles.guard';
import { ModuleGuard } from '../core/auth/module.guard';
import { Roles } from '../core/auth/roles.decorator';
import { RequireModule } from '../core/auth/require-module.decorator';

/**
 * Pack Intérim — Phase 4 of the roadmap (section 13). Prisma models
 * (InterimMission, InterimAssignment, InterimTimesheet, InterimAdvance)
 * already exist so the module activates and is gated correctly today;
 * business logic and the RH-dependency check happen at subscription
 * time (AuthService.subscribe). See docs/ARCHITECTURE.md.
 */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.INTERIM)
@Roles(Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('interim')
export class InterimController {
  @Get('status')
  status() {
    return {
      module: ModuleCode.INTERIM,
      active: true,
      phase: 'Phase 4 — non implémenté',
      message:
        "Le Pack Intérim est activé pour cette entreprise. Missions, pointage terrain renforcé, portail client et acomptes sont prévus en Phase 4 de la feuille de route.",
    };
  }
}
