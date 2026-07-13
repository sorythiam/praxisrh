import { Injectable, Logger } from '@nestjs/common';
import { ClockEventSource } from '@praxis/shared';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { CurrentEmployeeService } from '../common/current-employee.service';
import { ClockEventInputDto } from './dto/clock-event.dto';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

/**
 * Offline-first pointeuse (section 6.3): the PWA queues clock events in
 * IndexedDB while offline, tagging each with a client-generated
 * `clientEventId`, then replays the queue here once connectivity
 * returns. The (tenantId, clientEventId) unique constraint makes replays
 * safe — resyncing the same event twice (e.g. a retried request) is a
 * silent no-op rather than a duplicate clock event.
 */
@Injectable()
export class TimeclockService {
  private readonly logger = new Logger(TimeclockService.name);

  constructor(
    private tenantPrisma: TenantPrismaService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  async syncMyEvents(events: ClockEventInputDto[]) {
    const employee = await this.currentEmployee.resolve();
    const results = [];
    for (const evt of events) {
      try {
        const created = await this.client.clockEvent.create({
          data: {
            employeeId: employee.id,
            type: evt.type,
            timestamp: new Date(evt.timestamp),
            source: ClockEventSource.OFFLINE_SYNC,
            clientEventId: evt.clientEventId,
            latitude: evt.latitude,
            longitude: evt.longitude,
            photoUrl: evt.photoUrl,
          },
        });
        results.push({ clientEventId: evt.clientEventId, status: 'created', id: created.id });
      } catch (err: any) {
        if (err.code === PRISMA_UNIQUE_VIOLATION) {
          results.push({ clientEventId: evt.clientEventId, status: 'already_synced' });
        } else {
          this.logger.error(`Failed to sync clock event ${evt.clientEventId}`, err);
          results.push({ clientEventId: evt.clientEventId, status: 'error' });
        }
      }
    }
    return results;
  }

  async myRecentEvents(limit = 20) {
    const employee = await this.currentEmployee.resolve();
    return this.client.clockEvent.findMany({
      where: { employeeId: employee.id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /** Écarts planifié/réalisé — feeds directly into payroll generation (section 6.3/6.5). */
  async computeActualVsPlannedHours(employeeId: string, from: Date, to: Date) {
    const [shifts, events] = await Promise.all([
      this.client.shift.findMany({
        where: { employeeId, date: { gte: from, lte: to }, status: 'PUBLISHED' },
      }),
      this.client.clockEvent.findMany({
        where: { employeeId, timestamp: { gte: from, lte: to } },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    const plannedHours = shifts.reduce(
      (sum: number, s: any) => sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3_600_000,
      0,
    );

    let actualHours = 0;
    let openClockIn: Date | null = null;
    for (const evt of events) {
      if (evt.type === 'CLOCK_IN') {
        openClockIn = new Date(evt.timestamp);
      } else if (evt.type === 'CLOCK_OUT' && openClockIn) {
        actualHours += (new Date(evt.timestamp).getTime() - openClockIn.getTime()) / 3_600_000;
        openClockIn = null;
      }
    }

    return { plannedHours, actualHours, varianceHours: actualHours - plannedHours };
  }
}
