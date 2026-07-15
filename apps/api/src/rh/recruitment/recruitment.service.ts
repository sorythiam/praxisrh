import { BadRequestException, Injectable } from '@nestjs/common';
import { ApplicationStage } from '@prisma/client';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateApplicationDto, CreateJobPostingDto, HireApplicationDto } from './dto/recruitment.dto';

@Injectable()
export class RecruitmentService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
    private employeesService: EmployeesService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  createPosting(dto: CreateJobPostingDto) {
    return this.client.jobPosting.create({ data: dto });
  }

  listPostings() {
    return this.client.jobPosting.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getPosting(id: string) {
    const posting = await this.client.jobPosting.findUnique({ where: { id } });
    if (!posting) throw new BadRequestException('Offre introuvable.');
    return posting;
  }

  async closePosting(id: string) {
    return this.client.jobPosting.update({ where: { id }, data: { status: 'CLOSED' } });
  }

  /** Creates (or reuses) the Candidate record and opens an application against a posting. */
  async createApplication(jobPostingId: string, dto: CreateApplicationDto) {
    await this.getPosting(jobPostingId);
    const candidate = await this.client.candidate.create({
      data: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email, phone: dto.phone, resumeUrl: dto.resumeUrl },
    });
    return this.client.jobApplication.create({
      data: { jobPostingId, candidateId: candidate.id },
      include: { candidate: true },
    });
  }

  listApplications(jobPostingId: string) {
    return this.client.jobApplication.findMany({
      where: { jobPostingId },
      include: { candidate: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateStage(applicationId: string, stage: ApplicationStage) {
    if (stage === 'HIRED') {
      throw new BadRequestException('Utilisez /applications/:id/hire pour convertir en employé.');
    }
    const before = await this.client.jobApplication.findUnique({ where: { id: applicationId } });
    const application = await this.client.jobApplication.update({ where: { id: applicationId }, data: { stage } });
    await this.audit.log({
      action: 'APPLICATION_STAGE_CHANGED',
      entityType: 'JobApplication',
      entityId: applicationId,
      before,
      after: application,
    });
    return application;
  }

  /**
   * "Conversion automatique du dossier candidat en dossier employé (et
   * création du compte employé) à l'acceptation de l'offre" — section
   * 6.14. Reuses EmployeesService.create so the hire gets the exact same
   * Person/Employee/Contract/User-account creation as any other new
   * hire, with candidate contact details carried over with no re-entry.
   */
  async hire(applicationId: string, dto: HireApplicationDto) {
    const application = await this.client.jobApplication.findUnique({
      where: { id: applicationId },
      include: { candidate: true },
    });
    if (!application) throw new BadRequestException('Candidature introuvable.');
    if (application.stage === 'HIRED') {
      throw new BadRequestException('Cette candidature a déjà été convertie en employé.');
    }

    const result = await this.employeesService.create({
      firstName: application.candidate.firstName,
      lastName: application.candidate.lastName,
      email: application.candidate.email ?? undefined,
      phone: application.candidate.phone ?? undefined,
      employeeNumber: dto.employeeNumber,
      position: dto.position,
      employmentCategory: dto.employmentCategory,
      hireDate: dto.hireDate,
      contractType: dto.contractType,
      baseSalaryFcfa: dto.baseSalaryFcfa,
      establishmentId: dto.establishmentId,
    });

    const application_ = await this.client.jobApplication.update({
      where: { id: applicationId },
      data: { stage: 'HIRED', hiredEmployeeId: result.employee.id },
    });

    await this.audit.log({
      action: 'APPLICATION_HIRED',
      entityType: 'JobApplication',
      entityId: applicationId,
      after: { employeeId: result.employee.id },
    });

    return { application: application_, employee: result.employee };
  }
}
