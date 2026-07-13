import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { MODULE_DEPENDENCIES, ModuleCode, Role } from '@praxis/shared';
import { PrismaService } from '../prisma/prisma.service';
import { withRlsBypass } from '../prisma/rls-bypass';
import { SubscribeDto } from './dto/subscribe.dto';
import { LoginDto } from './dto/login.dto';

const TRIAL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /**
   * Creates a brand-new, isolated tenant. This is the one legitimate place
   * in the codebase that writes tenant-scoped rows without going through
   * TenantPrismaService/withTenantScoping: there is no tenant to scope to
   * yet — this call is what brings one into existence.
   */
  async subscribe(dto: SubscribeDto) {
    for (const [module, deps] of Object.entries(MODULE_DEPENDENCIES)) {
      if (dto.modules.includes(module as ModuleCode)) {
        const missing = deps!.filter((d) => !dto.modules.includes(d));
        if (missing.length > 0) {
          throw new BadRequestException(
            `Le module ${module} requiert ${missing.join(', ')} sur le même espace.`,
          );
        }
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          sector: dto.sector,
          countryCode: dto.countryCode ?? 'SN',
        },
      });

      // The RLS policy on every tenant-scoped table (prisma/rls.sql)
      // FORCE-checks `app.tenant_id` on every write, including this one.
      // Outside of TenantTransactionInterceptor (which sets it for every
      // authenticated request) this is the one place that legitimately
      // writes tenant-scoped rows before any request context exists, so
      // it sets the session variable itself for the rest of this
      // transaction — the same mechanism, not a bypass.
      await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenant.id}'`);

      await tx.subscription.create({
        data: { tenantId: tenant.id, trialEndsAt, status: 'TRIALING' },
      });

      await tx.moduleActivation.createMany({
        data: dto.modules.map((moduleCode) => ({ tenantId: tenant.id, moduleCode })),
      });

      const person = await tx.person.create({
        data: {
          tenantId: tenant.id,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          email: dto.adminEmail,
          phone: dto.adminPhone,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          personId: person.id,
          email: dto.adminEmail,
          phone: dto.adminPhone,
          passwordHash,
          role: Role.COMPANY_ADMIN,
        },
      });

      return { tenant, user };
    });

    const accessToken = this.signToken(result.user.id, result.tenant.id, Role.COMPANY_ADMIN);
    return {
      accessToken,
      tenant: { id: result.tenant.id, name: result.tenant.name },
      trialEndsAt,
    };
  }

  /**
   * NOTE: email/phone are unique per tenant, not globally — two different
   * client companies could legitimately onboard someone with the same
   * address. This MVP resolves the first active match; production should
   * disambiguate with a company slug on the login screen when that
   * collision matters for a given deployment.
   */
  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email ou téléphone requis.');
    }
    const user = await withRlsBypass(this.prisma, (tx) =>
      tx.user.findFirst({
        where: {
          isActive: true,
          OR: [dto.email ? { email: dto.email } : undefined, dto.phone ? { phone: dto.phone } : undefined].filter(
            Boolean,
          ) as any,
        },
      }),
    );
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    await withRlsBypass(this.prisma, (tx) =>
      tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    );
    const accessToken = this.signToken(user.id, user.tenantId, user.role as Role);
    return { accessToken, role: user.role, tenantId: user.tenantId };
  }

  private signToken(userId: string, tenantId: string | null, role: Role) {
    return this.jwt.sign({ sub: userId, tenantId, role });
  }
}
