import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { withRlsBypass } from '../prisma/rls-bypass';

/**
 * PRAXIS_ADMIN back-office: subscription/billing/module-activation
 * administration across ALL tenants. By design this operates outside the
 * per-tenant transaction (there is no single tenant to scope to) and
 * uses the plain PrismaService with fully explicit, hand-written
 * queries — the one deliberate exception to "always go through
 * TenantPrismaService". It must never expose operational data (payroll,
 * IPM cases, employee records) — only account/subscription metadata.
 * `subscription`/`moduleActivation` are RLS-protected tables, so every
 * cross-tenant read/write here goes through the explicit bypass.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PRAXIS_ADMIN)
@Controller('backoffice')
export class BackofficeController {
  constructor(private prisma: PrismaService) {}

  @Get('tenants')
  listTenants() {
    return withRlsBypass(this.prisma, (tx) =>
      tx.tenant.findMany({
        include: { subscription: true, moduleActivations: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return withRlsBypass(this.prisma, (tx) =>
      tx.tenant.findUnique({
        where: { id },
        include: { subscription: true, moduleActivations: true },
      }),
    );
  }

  @Patch('tenants/:id/subscription')
  updateSubscription(@Param('id') id: string, @Body() body: { status?: string; billingCycle?: string }) {
    return withRlsBypass(this.prisma, (tx) =>
      tx.subscription.update({
        where: { tenantId: id },
        data: body as any,
      }),
    );
  }

  @Patch('tenants/:id/modules/:moduleCode')
  toggleModule(
    @Param('id') id: string,
    @Param('moduleCode') moduleCode: ModuleCode,
    @Body() body: { isActive: boolean },
  ) {
    return withRlsBypass(this.prisma, (tx) =>
      tx.moduleActivation.upsert({
        where: { tenantId_moduleCode: { tenantId: id, moduleCode } },
        update: { isActive: body.isActive, deactivatedAt: body.isActive ? null : new Date() },
        create: { tenantId: id, moduleCode, isActive: body.isActive },
      }),
    );
  }
}
