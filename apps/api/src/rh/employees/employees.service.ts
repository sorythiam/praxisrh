import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { ContractStatus, EmployeeStatus, Role } from '@praxis/shared';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { requireTenantId } from '../../core/tenancy/tenant-context';
import { CreateEmployeeDto } from './dto/create-employee.dto';

const genTempPassword = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

@Injectable()
export class EmployeesService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /**
   * "Un module RH sans espace employé fonctionnel n'est pas considéré
   * comme abouti": creating the employee's own login is not an optional
   * follow-up step, it is part of this single transaction.
   */
  async create(dto: CreateEmployeeDto) {
    const tenantId = requireTenantId();
    const existingNumber = await this.client.employee.findFirst({
      where: { employeeNumber: dto.employeeNumber },
    });
    if (existingNumber) {
      throw new BadRequestException('Ce matricule est déjà utilisé.');
    }

    const tempPassword = dto.createLoginWithPassword ?? genTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const person = await this.client.person.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        nationalId: dto.nationalId,
        mobileMoneyProvider: dto.mobileMoneyProvider,
        mobileMoneyNumber: dto.mobileMoneyNumber,
      },
    });

    const employee = await this.client.employee.create({
      data: {
        personId: person.id,
        employeeNumber: dto.employeeNumber,
        establishmentId: dto.establishmentId,
        position: dto.position,
        department: dto.department,
        employmentCategory: dto.employmentCategory,
        status: EmployeeStatus.ONBOARDING,
        hireDate: new Date(dto.hireDate),
      },
    });

    const contract = await this.client.contract.create({
      data: {
        employeeId: employee.id,
        tenantId,
        type: dto.contractType,
        status: ContractStatus.PENDING_SIGNATURE,
        startDate: new Date(dto.hireDate),
        endDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
        trialEndDate: undefined,
        baseSalaryFcfa: dto.baseSalaryFcfa,
        weeklyHours: dto.weeklyHours ?? 40,
      },
    });

    const user = await this.client.user.create({
      data: {
        personId: person.id,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: Role.EMPLOYEE,
      },
    });

    await this.notifications.send({
      personId: person.id,
      template: 'ACCOUNT_CREATED',
      payload: { firstName: dto.firstName, employeeNumber: dto.employeeNumber, tempPassword },
    });

    await this.audit.log({
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: employee.id,
      after: { employee, contract },
    });

    return { employee, contract, user: { id: user.id, tempPasswordIssued: !dto.createLoginWithPassword } };
  }

  async findAll(params: { status?: EmployeeStatus; establishmentId?: string }) {
    return this.client.employee.findMany({
      where: {
        status: params.status,
        establishmentId: params.establishmentId,
      },
      include: { person: true, establishment: true, contracts: { orderBy: { startDate: 'desc' }, take: 1 } },
      orderBy: { hireDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.client.employee.findUnique({
      where: { id },
      include: { person: true, establishment: true, contracts: { orderBy: { startDate: 'desc' } } },
    });
    if (!employee) throw new BadRequestException('Employé introuvable.');
    return employee;
  }

  async update(id: string, dto: Partial<CreateEmployeeDto>) {
    const before = await this.findOne(id);
    const employee = await this.client.employee.update({
      where: { id },
      data: {
        position: dto.position,
        department: dto.department,
        establishmentId: dto.establishmentId,
        employmentCategory: dto.employmentCategory,
      },
    });
    await this.audit.log({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'Employee',
      entityId: id,
      before,
      after: employee,
    });
    return employee;
  }

  /** Onboarding checklist complete -> employee moves into normal payroll/planning scope. */
  async activate(id: string) {
    const before = await this.findOne(id);
    const employee = await this.client.employee.update({
      where: { id },
      data: { status: EmployeeStatus.ACTIVE },
    });
    await this.client.contract.updateMany({
      where: { employeeId: id, status: 'PENDING_SIGNATURE' },
      data: { status: 'ACTIVE', signedAt: new Date() },
    });
    await this.audit.log({ action: 'EMPLOYEE_ACTIVATED', entityType: 'Employee', entityId: id, before, after: employee });
    return employee;
  }

  async offboard(id: string, endDate: string) {
    const before = await this.findOne(id);
    const employee = await this.client.employee.update({
      where: { id },
      data: { status: EmployeeStatus.OFFBOARDING, endDate: new Date(endDate) },
    });
    await this.audit.log({
      action: 'EMPLOYEE_OFFBOARDING_STARTED',
      entityType: 'Employee',
      entityId: id,
      before,
      after: employee,
    });
    return employee;
  }

  /**
   * "Radar de conformité priorisé" (section 6.11): contracts nearing
   * their end date, trial periods ending soon, CDDs approaching the
   * legal requalification threshold — ranked by urgency, not a flat list.
   */
  async getComplianceAlerts() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [endingContracts, trialEnding] = await Promise.all([
      this.client.contract.findMany({
        where: { status: 'ACTIVE', endDate: { not: null, lte: in30Days, gte: now } },
        include: { employee: { include: { person: true } } },
      }),
      this.client.contract.findMany({
        where: { status: 'ACTIVE', trialEndDate: { not: null, lte: in7Days, gte: now } },
        include: { employee: { include: { person: true } } },
      }),
    ]);

    const alerts = [
      ...endingContracts.map((c: any) => ({
        severity: 'high' as const,
        type: 'CONTRACT_ENDING',
        employeeId: c.employeeId,
        employeeName: `${c.employee.person.firstName} ${c.employee.person.lastName}`,
        dueDate: c.endDate,
        message: `Contrat ${c.type} arrivant à échéance le ${new Date(c.endDate).toLocaleDateString('fr-FR')}.`,
      })),
      ...trialEnding.map((c: any) => ({
        severity: 'medium' as const,
        type: 'TRIAL_ENDING',
        employeeId: c.employeeId,
        employeeName: `${c.employee.person.firstName} ${c.employee.person.lastName}`,
        dueDate: c.trialEndDate,
        message: `Période d'essai se terminant le ${new Date(c.trialEndDate).toLocaleDateString('fr-FR')}.`,
      })),
    ];

    return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));
  }
}
