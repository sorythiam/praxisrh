import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { getCurrentUserId } from '../../core/tenancy/tenant-context';
import { BlacklistEmployeeDto, ReportIncidentDto } from './dto/incidents.dto';

@Injectable()
export class IncidentsService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /** "Incidents/blacklisting" (9.4) — a reported incident, by itself, does not blacklist anyone. */
  async reportIncident(dto: ReportIncidentDto) {
    const incident = await this.client.interimIncident.create({
      data: {
        employeeId: dto.employeeId,
        missionId: dto.missionId,
        description: dto.description,
        severity: dto.severity,
        reportedBy: getCurrentUserId(),
      },
    });
    await this.audit.log({ action: 'INTERIM_INCIDENT_REPORTED', entityType: 'InterimIncident', entityId: incident.id, after: incident });
    return incident;
  }

  listIncidents(employeeId?: string) {
    return this.client.interimIncident.findMany({
      where: { employeeId },
      include: { employee: { include: { person: true } }, mission: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async blacklist(dto: BlacklistEmployeeDto) {
    const existing = await this.client.interimBlacklistEntry.findUnique({ where: { employeeId: dto.employeeId } });
    if (existing && existing.liftedAt === null) {
      throw new BadRequestException('Cet employé est déjà sur liste noire.');
    }
    const entry = await this.client.interimBlacklistEntry.upsert({
      where: { employeeId: dto.employeeId },
      update: { reason: dto.reason, blacklistedBy: getCurrentUserId(), createdAt: new Date(), liftedAt: null, liftedReason: null },
      create: { employeeId: dto.employeeId, reason: dto.reason, blacklistedBy: getCurrentUserId() },
    });
    await this.audit.log({ action: 'INTERIM_EMPLOYEE_BLACKLISTED', entityType: 'InterimBlacklistEntry', entityId: entry.id, after: entry });
    return entry;
  }

  async liftBlacklist(employeeId: string, liftedReason?: string) {
    const existing = await this.client.interimBlacklistEntry.findUnique({ where: { employeeId } });
    if (!existing || existing.liftedAt !== null) {
      throw new BadRequestException("Cet employé n'est pas sur liste noire.");
    }
    const entry = await this.client.interimBlacklistEntry.update({
      where: { employeeId },
      data: { liftedAt: new Date(), liftedReason },
    });
    await this.audit.log({ action: 'INTERIM_BLACKLIST_LIFTED', entityType: 'InterimBlacklistEntry', entityId: entry.id, after: entry });
    return entry;
  }

  listBlacklist() {
    return this.client.interimBlacklistEntry.findMany({
      where: { liftedAt: null },
      include: { employee: { include: { person: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
