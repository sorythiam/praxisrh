import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import * as bcrypt from 'bcryptjs';
import { NotificationChannel, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../core/auth/jwt-auth.guard';
import { RolesGuard } from '../core/auth/roles.guard';
import { Roles } from '../core/auth/roles.decorator';
import { TenantPrismaService } from '../core/prisma/tenant-prisma.service';
import { NotificationsService } from '../core/notifications/notifications.service';
import { AuditService } from '../core/audit/audit.service';
import { InviteUserDto } from './dto/invite-user.dto';

const genTempPassword = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

const INVITABLE_ROLES = [Role.HR_ADMIN, Role.IPM_MANAGER, Role.INTERIM_MANAGER, Role.MANAGER];

/**
 * "Invitation des utilisateurs internes (DRH, gestionnaires, managers)"
 * (section 4.4) — distinct from EmployeesService.create, which creates
 * self-service EMPLOYEE accounts as part of the hiring workflow. Internal
 * staff accounts are not tied to a Person/Employee record; COMPANY_ADMIN
 * can never invite another COMPANY_ADMIN or a PRAXIS_ADMIN this way.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  @Roles(Role.COMPANY_ADMIN, Role.HR_ADMIN)
  @Get()
  list() {
    return (this.tenantPrisma.client as any).user.findMany({
      select: { id: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Roles(Role.COMPANY_ADMIN)
  @Post('invite')
  async invite(@Body() dto: InviteUserDto) {
    if (!INVITABLE_ROLES.includes(dto.role)) {
      throw new BadRequestException(`Rôle non invitable via ce parcours: ${dto.role}.`);
    }
    const client = this.tenantPrisma.client as any;
    const existing = await client.user.findFirst({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Un utilisateur avec cet email existe déjà.');
    }

    const tempPassword = genTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const person = await client.person.create({
      data: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email, phone: dto.phone },
    });
    const user = await client.user.create({
      data: { personId: person.id, email: dto.email, phone: dto.phone, passwordHash, role: dto.role },
    });

    await this.notifications.send({
      personId: person.id,
      template: 'USER_INVITED',
      payload: { firstName: dto.firstName, role: dto.role, tempPassword },
      preferredChannel: NotificationChannel.EMAIL,
    });

    await this.audit.log({ action: 'USER_INVITED', entityType: 'User', entityId: user.id, after: { role: dto.role } });

    return { id: user.id, email: user.email, role: user.role };
  }
}
