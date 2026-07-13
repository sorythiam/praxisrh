import { Injectable } from '@nestjs/common';
import { ShiftStatus } from '@praxis/shared';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { CurrentEmployeeService } from '../common/current-employee.service';
import { CreateShiftDto } from './dto/shift.dto';

const MIN_REST_HOURS = 11;
const MAX_WEEKLY_HOURS_BEFORE_FLAG = 48; // legal ceiling incl. overtime in most UEMOA codes

@Injectable()
export class PlanningService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private notifications: NotificationsService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  async createShift(dto: CreateShiftDto) {
    return this.client.shift.create({
      data: {
        employeeId: dto.employeeId,
        establishmentId: dto.establishmentId,
        date: new Date(dto.date),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: ShiftStatus.DRAFT,
      },
    });
  }

  async bulkCreate(shifts: CreateShiftDto[]) {
    return Promise.all(shifts.map((s) => this.createShift(s)));
  }

  /** Duplicate every shift in [weekStart, weekStart+6d] by `weeksAhead` weeks. */
  async duplicateWeek(establishmentId: string | undefined, weekStart: string, weeksAhead: number) {
    const start = new Date(weekStart);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sourceShifts = await this.client.shift.findMany({
      where: { establishmentId, date: { gte: start, lt: end } },
    });

    const created = [];
    for (let w = 1; w <= weeksAhead; w++) {
      const offsetMs = w * 7 * 24 * 60 * 60 * 1000;
      for (const s of sourceShifts) {
        created.push(
          await this.client.shift.create({
            data: {
              employeeId: s.employeeId,
              establishmentId: s.establishmentId,
              date: new Date(new Date(s.date).getTime() + offsetMs),
              startTime: new Date(new Date(s.startTime).getTime() + offsetMs),
              endTime: new Date(new Date(s.endTime).getTime() + offsetMs),
              status: ShiftStatus.DRAFT,
            },
          }),
        );
      }
    }
    return created;
  }

  async publish(shiftIds: string[]) {
    await this.client.shift.updateMany({
      where: { id: { in: shiftIds } },
      data: { status: ShiftStatus.PUBLISHED, publishedAt: new Date() },
    });
    const shifts = await this.client.shift.findMany({
      where: { id: { in: shiftIds } },
      include: { employee: { include: { person: true } } },
    });
    const byEmployee = new Map<string, any[]>();
    for (const s of shifts) {
      if (!byEmployee.has(s.employeeId)) byEmployee.set(s.employeeId, []);
      byEmployee.get(s.employeeId)!.push(s);
    }
    for (const [, empShifts] of byEmployee) {
      const person = empShifts[0].employee.person;
      await this.notifications.send({
        personId: person.id,
        template: 'PLANNING_PUBLISHED',
        payload: { shiftCount: empShifts.length },
      });
    }
    return { publishedCount: shiftIds.length };
  }

  async listByRange(params: { establishmentId?: string; from: string; to: string }) {
    const shifts = await this.client.shift.findMany({
      where: {
        establishmentId: params.establishmentId,
        date: { gte: new Date(params.from), lte: new Date(params.to) },
      },
      include: { employee: { include: { person: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return { shifts, complianceFlags: this.computeComplianceFlags(shifts) };
  }

  async myShifts(from: string, to: string) {
    const employee = await this.currentEmployee.resolve();
    return this.client.shift.findMany({
      where: { employeeId: employee.id, date: { gte: new Date(from), lte: new Date(to) } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async remove(id: string) {
    return this.client.shift.delete({ where: { id } });
  }

  /**
   * "Alertes visuelles de conformité au temps de travail légal du pays"
   * (section 6.2): flags excessive weekly amplitude and insufficient
   * rest between two consecutive shifts. Kept intentionally simple for
   * Phase 1 — a full per-country engine (breaks, night-work premiums,
   * public-holiday rules) is a natural Phase 2 extension of RulesService.
   */
  private computeComplianceFlags(shifts: any[]): Array<{ employeeId: string; type: string; message: string }> {
    const flags: Array<{ employeeId: string; type: string; message: string }> = [];
    const byEmployee = new Map<string, any[]>();
    for (const s of shifts) {
      if (!byEmployee.has(s.employeeId)) byEmployee.set(s.employeeId, []);
      byEmployee.get(s.employeeId)!.push(s);
    }
    for (const [employeeId, empShifts] of byEmployee) {
      const sorted = [...empShifts].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
      let weeklyHours = 0;
      for (const s of sorted) {
        weeklyHours += (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3_600_000;
      }
      if (weeklyHours > MAX_WEEKLY_HOURS_BEFORE_FLAG) {
        flags.push({
          employeeId,
          type: 'AMPLITUDE_EXCESSIVE',
          message: `${weeklyHours.toFixed(1)}h planifiées sur la période, au-delà du seuil légal.`,
        });
      }
      for (let i = 1; i < sorted.length; i++) {
        const restHours =
          (new Date(sorted[i].startTime).getTime() - new Date(sorted[i - 1].endTime).getTime()) / 3_600_000;
        if (restHours < MIN_REST_HOURS) {
          flags.push({
            employeeId,
            type: 'REPOS_INSUFFISANT',
            message: `Seulement ${restHours.toFixed(1)}h de repos entre deux services (minimum ${MIN_REST_HOURS}h).`,
          });
        }
      }
    }
    return flags;
  }
}
