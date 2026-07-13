import { BadRequestException, Injectable } from '@nestjs/common';
import { LeaveRequestStatus, LeaveType } from '@praxis/shared';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { RulesService } from '../../core/rules/rules.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { AuditService } from '../../core/audit/audit.service';
import { CurrentEmployeeService } from '../common/current-employee.service';
import { getCurrentUserId } from '../../core/tenancy/tenant-context';
import { CreateLeaveRequestDto } from './dto/leave-request.dto';

function countBusinessDays(start: Date, end: Date): number {
  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

@Injectable()
export class LeaveService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private rules: RulesService,
    private notifications: NotificationsService,
    private audit: AuditService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  async getMyBalance(year: number) {
    const employee = await this.currentEmployee.resolve();
    return this.getBalanceForEmployee(employee.id, employee.hireDate, year);
  }

  private async getBalanceForEmployee(employeeId: string, hireDate: Date, year: number) {
    // Hardcoded to Senegal for Phase 1 (the only onboarded country); a
    // second country plugs in by reading tenant.countryCode here instead.
    const ruleSet = await this.rules.getActiveRuleSet('SN');
    const now = new Date();
    const periodStart = new Date(hireDate) > new Date(year, 0, 1) ? new Date(hireDate) : new Date(year, 0, 1);
    const periodEnd = year === now.getFullYear() ? now : new Date(year, 11, 31);
    const monthsWorked = Math.max(
      0,
      (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 + (periodEnd.getMonth() - periodStart.getMonth()),
    );
    const accruedDays = Math.round(monthsWorked * ruleSet.paidLeaveDaysPerMonthWorked * 10) / 10;

    const approvedThisYear = await this.client.leaveRequest.findMany({
      where: {
        employeeId,
        type: LeaveType.CONGE_PAYE,
        status: LeaveRequestStatus.APPROVED,
        startDate: { gte: new Date(year, 0, 1) },
        endDate: { lte: new Date(year, 11, 31) },
      },
    });
    const takenDays = approvedThisYear.reduce((s: number, r: any) => s + r.days, 0);

    return { year, accruedDays, takenDays, remainingDays: Math.round((accruedDays - takenDays) * 10) / 10 };
  }

  async createMyRequest(dto: CreateLeaveRequestDto) {
    const employee = await this.currentEmployee.resolve();
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début.');
    }

    const overlapping = await this.client.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: [LeaveRequestStatus.PENDING_MANAGER, LeaveRequestStatus.PENDING_HR, LeaveRequestStatus.APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping) {
      throw new BadRequestException('Une demande de congé existe déjà sur cette période.');
    }

    const days = countBusinessDays(startDate, endDate);
    const request = await this.client.leaveRequest.create({
      data: {
        employeeId: employee.id,
        type: dto.type,
        startDate,
        endDate,
        days,
        reason: dto.reason,
        status: LeaveRequestStatus.PENDING_MANAGER,
      },
    });
    return request;
  }

  async myRequests() {
    const employee = await this.currentEmployee.resolve();
    return this.client.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async pendingForManager(managerUserId: string) {
    const employeeIds = await this.currentEmployee.managedEmployeeIds(managerUserId);
    return this.client.leaveRequest.findMany({
      where: { employeeId: { in: employeeIds }, status: LeaveRequestStatus.PENDING_MANAGER },
      include: { employee: { include: { person: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async pendingForHr() {
    return this.client.leaveRequest.findMany({
      where: { status: LeaveRequestStatus.PENDING_HR },
      include: { employee: { include: { person: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async managerDecision(id: string, approve: boolean, reason?: string) {
    const before = await this.client.leaveRequest.findUnique({ where: { id } });
    const request = await this.client.leaveRequest.update({
      where: { id },
      data: {
        status: approve ? LeaveRequestStatus.PENDING_HR : LeaveRequestStatus.REJECTED,
        managerDecisionBy: getCurrentUserId(),
        managerDecisionAt: new Date(),
        rejectionReason: approve ? undefined : reason,
      },
      include: { employee: { include: { person: true } } },
    });
    await this.audit.log({ action: 'LEAVE_MANAGER_DECISION', entityType: 'LeaveRequest', entityId: id, before, after: request });
    if (!approve) {
      await this.notifications.send({
        personId: request.employee.person.id,
        template: 'LEAVE_DECISION',
        payload: { status: 'REJECTED', by: 'manager', reason },
      });
    }
    return request;
  }

  async hrDecision(id: string, approve: boolean, reason?: string) {
    const before = await this.client.leaveRequest.findUnique({ where: { id } });
    const request = await this.client.leaveRequest.update({
      where: { id },
      data: {
        status: approve ? LeaveRequestStatus.APPROVED : LeaveRequestStatus.REJECTED,
        hrDecisionBy: getCurrentUserId(),
        hrDecisionAt: new Date(),
        rejectionReason: approve ? undefined : reason,
      },
      include: { employee: { include: { person: true } } },
    });
    await this.audit.log({ action: 'LEAVE_HR_DECISION', entityType: 'LeaveRequest', entityId: id, before, after: request });
    await this.notifications.send({
      personId: request.employee.person.id,
      template: 'LEAVE_DECISION',
      payload: { status: request.status, reason },
    });
    return request;
  }

  /** Team calendar with overlap detection (section 6.4). */
  async teamCalendar(managerUserId: string, from: string, to: string) {
    const employeeIds = await this.currentEmployee.managedEmployeeIds(managerUserId);
    const requests = await this.client.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: { in: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.PENDING_MANAGER, LeaveRequestStatus.PENDING_HR] },
        startDate: { lte: new Date(to) },
        endDate: { gte: new Date(from) },
      },
      include: { employee: { include: { person: true } } },
    });

    const overlaps: Array<{ date: string; employees: string[] }> = [];
    const byDate = new Map<string, string[]>();
    for (const r of requests) {
      const cursor = new Date(r.startDate);
      while (cursor <= new Date(r.endDate)) {
        const key = cursor.toISOString().slice(0, 10);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(`${r.employee.person.firstName} ${r.employee.person.lastName}`);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    for (const [date, names] of byDate) {
      if (names.length > 1) overlaps.push({ date, employees: names });
    }

    return { requests, overlaps };
  }
}
