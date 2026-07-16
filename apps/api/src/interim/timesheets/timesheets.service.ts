import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { InterimTimesheetStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { StorageService } from '../../core/storage/storage.service';
import { AuditService } from '../../core/audit/audit.service';
import { CurrentEmployeeService } from '../../rh/common/current-employee.service';
import { requireTenantId } from '../../core/tenancy/tenant-context';
import { withRlsBypass } from '../../core/prisma/rls-bypass';
import { ClientValidationDecisionDto, SubmitTimesheetDto } from './dto/timesheets.dto';

const genToken = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 32);

@Injectable()
export class TimesheetsService {
  private readonly logger = new Logger(TimesheetsService.name);

  constructor(
    private tenantPrisma: TenantPrismaService,
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AuditService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  /**
   * "Pointeuse terrain renforcée" (9.2): the intérimaire submits a daily
   * entry with GPS and (optionally, via uploadSelfie below) a selfie; the
   * site QR token is compared against the mission's own token to prove
   * physical presence rather than trusted at face value. Also opens the
   * "extranet validation client" loop (9.3) by minting a one-time link.
   */
  async submitMyTimesheet(dto: SubmitTimesheetDto) {
    const employee = await this.currentEmployee.resolve();
    const assignment = await this.client.interimAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: { mission: true },
    });
    if (!assignment || assignment.employeeId !== employee.id) {
      throw new BadRequestException("Cette affectation n'appartient pas à votre dossier.");
    }
    if (assignment.status !== 'ACTIVE') {
      throw new BadRequestException("Cette affectation n'est plus active.");
    }

    const siteQrVerified = Boolean(dto.siteQrToken) && dto.siteQrToken === assignment.mission.siteQrToken;

    try {
      const timesheet = await this.client.interimTimesheet.create({
        data: {
          assignmentId: dto.assignmentId,
          date: new Date(dto.date),
          hours: dto.hours,
          clockInLatitude: dto.latitude,
          clockInLongitude: dto.longitude,
          siteQrVerified,
          validationToken: genToken(),
        },
      });
      await this.audit.log({ action: 'INTERIM_TIMESHEET_SUBMITTED', entityType: 'InterimTimesheet', entityId: timesheet.id, after: timesheet });
      await this.notifyClientContact(assignment.mission, timesheet);
      return timesheet;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new BadRequestException('Un pointage existe déjà pour cette affectation à cette date.');
      }
      throw err;
    }
  }

  async uploadSelfie(timesheetId: string, filename: string, content: Buffer) {
    const tenantId = requireTenantId();
    const relativePath = `${tenantId}/interim-selfies/${timesheetId}/${Date.now()}-${filename}`;
    await this.storage.save(relativePath, content);
    return this.client.interimTimesheet.update({ where: { id: timesheetId }, data: { selfieUrl: relativePath } });
  }

  async getMyTimesheets() {
    const employee = await this.currentEmployee.resolve();
    return this.client.interimTimesheet.findMany({
      where: { assignment: { employeeId: employee.id } },
      include: { assignment: { include: { mission: true } } },
      orderBy: { date: 'desc' },
    });
  }

  list(filters: { missionId?: string; assignmentId?: string; status?: InterimTimesheetStatus }) {
    return this.client.interimTimesheet.findMany({
      where: {
        assignmentId: filters.assignmentId,
        status: filters.status,
        assignment: filters.missionId ? { missionId: filters.missionId } : undefined,
      },
      include: { assignment: { include: { employee: { include: { person: true } }, mission: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async get(id: string) {
    const timesheet = await this.client.interimTimesheet.findUnique({
      where: { id },
      include: { assignment: { include: { employee: { include: { person: true } }, mission: true } } },
    });
    if (!timesheet) throw new BadRequestException('Pointage introuvable.');
    return timesheet;
  }

  /**
   * No client login exists in this build (same documented simplification
   * as IPM's provider portal — see providers.controller.ts) — the client
   * contact validates via the token minted at submission, so these three
   * methods run with NO tenant in AsyncLocalStorage context (the token
   * itself is what proves the caller may see/act on this one row), the
   * same sanctioned RLS-bypass pattern AuthService.login uses to search
   * across tenants by email.
   */
  async getByToken(token: string) {
    const timesheet = await withRlsBypass<any>(this.prisma, (tx) =>
      (tx as any).interimTimesheet.findUnique({
        where: { validationToken: token },
        include: { assignment: { include: { employee: { include: { person: true } }, mission: true } } },
      }),
    );
    if (!timesheet) throw new BadRequestException('Lien de validation invalide ou expiré.');

    // Curated shape rather than the raw row: the token is the only
    // credential here, so this response shouldn't leak tenantId,
    // internal ids, or the employee's contact details to whoever holds
    // the link.
    return {
      status: timesheet.status,
      date: timesheet.date,
      hours: timesheet.hours,
      siteQrVerified: timesheet.siteQrVerified,
      employeeName: `${timesheet.assignment.employee.person.firstName} ${timesheet.assignment.employee.person.lastName}`,
      clientName: timesheet.assignment.mission.clientName,
      siteName: timesheet.assignment.mission.siteName,
      validatedAt: timesheet.validatedAt,
      validatedByName: timesheet.validatedByName,
      rejectionReason: timesheet.rejectionReason,
    };
  }

  async decideByToken(token: string, approve: boolean, dto: ClientValidationDecisionDto) {
    return withRlsBypass(this.prisma, async (tx) => {
      const client = tx as any;
      const timesheet = await client.interimTimesheet.findUnique({ where: { validationToken: token } });
      if (!timesheet) throw new BadRequestException('Lien de validation invalide ou expiré.');
      if (timesheet.status !== InterimTimesheetStatus.SUBMITTED) {
        throw new BadRequestException('Ce pointage a déjà été traité.');
      }
      const updated = await client.interimTimesheet.update({
        where: { id: timesheet.id },
        data: {
          status: approve ? InterimTimesheetStatus.APPROVED : InterimTimesheetStatus.REJECTED,
          validatedAt: new Date(),
          validatedByName: dto.validatedByName,
          rejectionReason: approve ? undefined : dto.rejectionReason,
        },
      });
      return { status: updated.status, validatedAt: updated.validatedAt, validatedByName: updated.validatedByName };
    });
  }

  /**
   * No Person/User record represents an external client contact, so this
   * can't go through the shared NotificationsService (which is keyed on
   * personId) — logged the same way NotificationsService's own
   * WhatsApp/SMS adapters are stubbed, ready to swap for a real send once
   * a client-contact channel exists.
   */
  private async notifyClientContact(mission: { clientContactEmail?: string | null; clientContactPhone?: string | null }, timesheet: { validationToken: string | null }) {
    const target = mission.clientContactEmail ?? mission.clientContactPhone ?? '(aucun contact renseigné)';
    this.logger.log(`[CLIENT VALIDATION LINK stub] -> ${target}: /interim/client-validation/${timesheet.validationToken}`);
  }
}
