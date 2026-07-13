import { Controller, Get, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../core/auth/jwt-auth.guard';
import { RolesGuard } from '../core/auth/roles.guard';
import { ModuleGuard } from '../core/auth/module.guard';
import { Roles } from '../core/auth/roles.decorator';
import { RequireModule } from '../core/auth/require-module.decorator';

/**
 * Praxis IPM — Phase 3 of the roadmap (section 13). The Prisma models
 * (IpmBeneficiary, IpmContribution, IpmProvider, IpmReimbursementCase)
 * already exist in schema.prisma so the module activates cleanly and
 * the isolation guard below is real and testable today — only the
 * business logic (adhésions, cotisations, tiers-payant, remboursements,
 * contrôle médical, exports ICAMO) remains to be built on top of it.
 * See docs/ARCHITECTURE.md.
 */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.IPM)
@Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
@Controller('ipm')
export class IpmController {
  @Get('status')
  status() {
    return {
      module: ModuleCode.IPM,
      active: true,
      phase: 'Phase 3 — non implémenté',
      message:
        "Le module Praxis IPM est activé pour cette entreprise. Les fonctionnalités (adhérents, cotisations, tiers-payant, remboursements) sont prévues en Phase 3 de la feuille de route.",
    };
  }
}
