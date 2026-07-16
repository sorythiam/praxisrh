import { BadRequestException, Injectable } from '@nestjs/common';
import { InterimAssignmentStatus, InterimMissionStatus } from '@prisma/client';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';
import { assertNotBlacklisted } from '../interim-common';
import { CreateAssignmentDto, CreateMissionDto } from './dto/missions.dto';

@Injectable()
export class MissionsService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /** "Missions & affectations avec double taux horaire" (9.1). */
  async createMission(dto: CreateMissionDto) {
    const mission = await this.client.interimMission.create({
      data: {
        clientName: dto.clientName,
        clientContactName: dto.clientContactName,
        clientContactEmail: dto.clientContactEmail,
        clientContactPhone: dto.clientContactPhone,
        siteName: dto.siteName,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        billingRateFcfaPerHour: dto.billingRateFcfaPerHour,
        payRateFcfaPerHour: dto.payRateFcfaPerHour,
      },
    });
    await this.audit.log({ action: 'INTERIM_MISSION_CREATED', entityType: 'InterimMission', entityId: mission.id, after: mission });
    return mission;
  }

  list() {
    return this.client.interimMission.findMany({
      include: { assignments: { include: { employee: { include: { person: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const mission = await this.client.interimMission.findUnique({
      where: { id },
      include: { assignments: { include: { employee: { include: { person: true } } } } },
    });
    if (!mission) throw new BadRequestException('Mission introuvable.');
    return mission;
  }

  async close(id: string) {
    const before = await this.get(id);
    const mission = await this.client.interimMission.update({ where: { id }, data: { status: InterimMissionStatus.CLOSED } });
    await this.audit.log({ action: 'INTERIM_MISSION_CLOSED', entityType: 'InterimMission', entityId: id, before, after: mission });
    return mission;
  }

  /** Refuses a blacklisted employee (9.4) rather than silently allowing the assignment. */
  async createAssignment(missionId: string, dto: CreateAssignmentDto) {
    await this.get(missionId);
    const blacklistEntry = await this.client.interimBlacklistEntry.findUnique({ where: { employeeId: dto.employeeId } });
    assertNotBlacklisted(blacklistEntry);

    const assignment = await this.client.interimAssignment.create({
      data: {
        missionId,
        employeeId: dto.employeeId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { employee: { include: { person: true } } },
    });
    await this.audit.log({ action: 'INTERIM_ASSIGNMENT_CREATED', entityType: 'InterimAssignment', entityId: assignment.id, after: assignment });
    return assignment;
  }

  listAssignments(missionId: string) {
    return this.client.interimAssignment.findMany({
      where: { missionId },
      include: { employee: { include: { person: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async endAssignment(assignmentId: string) {
    const before = await this.client.interimAssignment.findUnique({ where: { id: assignmentId } });
    if (!before) throw new BadRequestException('Affectation introuvable.');
    const assignment = await this.client.interimAssignment.update({
      where: { id: assignmentId },
      data: { status: InterimAssignmentStatus.ENDED, endDate: new Date() },
    });
    await this.audit.log({ action: 'INTERIM_ASSIGNMENT_ENDED', entityType: 'InterimAssignment', entityId: assignmentId, before, after: assignment });
    return assignment;
  }

  /** Self-service: an intérimaire's own active/past assignments. */
  async getMyAssignments() {
    const employee = await this.currentEmployee.resolve();
    return this.client.interimAssignment.findMany({
      where: { employeeId: employee.id },
      include: { mission: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
