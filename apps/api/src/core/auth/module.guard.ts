import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleCode } from '@praxis/shared';
import { REQUIRE_MODULE_KEY } from './require-module.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { withRlsBypass } from '../prisma/rls-bypass';

/**
 * Enforces the second, non-negotiable isolation rule from the spec: a
 * tenant that hasn't subscribed to a module must not be able to reach
 * its endpoints at all — not a 403 with data shape leaked, a clean
 * "module not active" response. Runs before the tenant transaction is
 * opened, so it queries directly (this is core infra, not a domain
 * repository — the one deliberate, explicit-tenantId exception).
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<ModuleCode>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user?.tenantId) {
      throw new ForbiddenException(`Module ${required} non actif pour ce compte.`);
    }
    const activation = await withRlsBypass(this.prisma, (tx) =>
      tx.moduleActivation.findUnique({
        where: { tenantId_moduleCode: { tenantId: user.tenantId, moduleCode: required } },
      }),
    );
    if (!activation?.isActive) {
      throw new ForbiddenException(`Le module ${required} n'est pas activé pour cette entreprise.`);
    }
    return true;
  }
}
