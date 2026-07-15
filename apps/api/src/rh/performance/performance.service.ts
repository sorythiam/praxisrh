import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@praxis/shared';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { CurrentEmployeeService } from '../common/current-employee.service';
import { TalentsService } from '../talents/talents.service';
import { getCurrentRole, getCurrentUserId } from '../../core/tenancy/tenant-context';
import {
  CalibrateReviewDto,
  CreateFeedbackDto,
  CreateKeyResultDto,
  CreateObjectiveDto,
  CreateReviewCycleDto,
  UpdateKeyResultDto,
  UpdateObjectiveDto,
  UpsertReviewDto,
} from './dto/performance.dto';

@Injectable()
export class PerformanceService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
    private currentEmployee: CurrentEmployeeService,
    private talents: TalentsService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  // -- Objectives (OKR) --

  createObjective(dto: CreateObjectiveDto) {
    if (dto.type === 'INDIVIDUAL' && !dto.employeeId) {
      throw new BadRequestException('employeeId requis pour un objectif individuel.');
    }
    if (dto.type === 'TEAM' && !dto.teamName) {
      throw new BadRequestException('teamName requis pour un objectif équipe.');
    }
    return this.client.objective.create({
      data: {
        employeeId: dto.employeeId,
        teamName: dto.teamName,
        type: dto.type,
        title: dto.title,
        periodLabel: dto.periodLabel,
      },
    });
  }

  listObjectives(params: { employeeId?: string; periodLabel?: string }) {
    return this.client.objective.findMany({
      where: { employeeId: params.employeeId, periodLabel: params.periodLabel },
      include: { keyResults: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyObjectives(periodLabel?: string) {
    const employee = await this.currentEmployee.resolve();
    return this.listObjectives({ employeeId: employee.id, periodLabel });
  }

  async updateObjective(id: string, dto: UpdateObjectiveDto) {
    return this.client.objective.update({ where: { id }, data: { status: dto.status } });
  }

  addKeyResult(objectiveId: string, dto: CreateKeyResultDto) {
    return this.client.keyResult.create({
      data: { objectiveId, description: dto.description, targetValue: dto.targetValue, unit: dto.unit },
    });
  }

  async updateKeyResult(id: string, dto: UpdateKeyResultDto) {
    if (getCurrentRole() === Role.EMPLOYEE) {
      const keyResult = await this.client.keyResult.findUnique({ where: { id }, include: { objective: true } });
      const employee = await this.currentEmployee.resolve();
      if (keyResult?.objective.employeeId !== employee.id) {
        throw new ForbiddenException("Vous ne pouvez mettre à jour que vos propres objectifs.");
      }
    }
    return this.client.keyResult.update({ where: { id }, data: { currentValue: dto.currentValue } });
  }

  // -- Continuous feedback (section 6.13) --

  async giveFeedback(dto: CreateFeedbackDto) {
    return this.client.feedback.create({
      data: {
        fromUserId: getCurrentUserId(),
        toEmployeeId: dto.toEmployeeId,
        type: dto.type,
        content: dto.content,
      },
    });
  }

  /**
   * "L'historique complet de feedback au moment de la revue annuelle,
   * pas seulement les trois derniers mois" (section 6.13 user story) —
   * deliberately no date filter or pagination cap here.
   */
  getEmployeeFeedback(employeeId: string) {
    return this.client.feedback.findMany({ where: { toEmployeeId: employeeId }, orderBy: { createdAt: 'desc' } });
  }

  async getMyFeedback() {
    const employee = await this.currentEmployee.resolve();
    return this.getEmployeeFeedback(employee.id);
  }

  // -- Review cycles & calibration --

  createReviewCycle(dto: CreateReviewCycleDto) {
    return this.client.reviewCycle.create({
      data: { periodLabel: dto.periodLabel, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
  }

  listReviewCycles() {
    return this.client.reviewCycle.findMany({ orderBy: { startDate: 'desc' } });
  }

  async upsertReview(reviewCycleId: string, dto: UpsertReviewDto) {
    const review = await this.client.performanceReview.upsert({
      where: { reviewCycleId_employeeId: { reviewCycleId, employeeId: dto.employeeId } },
      update: { selfScore: dto.selfScore, managerScore: dto.managerScore, managerComments: dto.managerComments },
      create: {
        reviewCycleId,
        employeeId: dto.employeeId,
        selfScore: dto.selfScore,
        managerScore: dto.managerScore,
        managerComments: dto.managerComments,
      },
    });

    if (dto.managerComments) {
      const cycle = await this.client.reviewCycle.findUnique({ where: { id: reviewCycleId } });
      await this.talents.appendNoteFromReview(
        dto.employeeId,
        `Suite à l'évaluation ${cycle?.periodLabel ?? ''}: ${dto.managerComments}`,
      );
    }

    await this.audit.log({
      action: 'PERFORMANCE_REVIEW_RECORDED',
      entityType: 'PerformanceReview',
      entityId: review.id,
      after: review,
    });
    return review;
  }

  calibrateReview(reviewId: string, dto: CalibrateReviewDto) {
    return this.client.performanceReview.update({ where: { id: reviewId }, data: { calibratedScore: dto.calibratedScore } });
  }

  listReviewsForCycle(reviewCycleId: string) {
    return this.client.performanceReview.findMany({
      where: { reviewCycleId },
      include: { employee: { include: { person: true } } },
    });
  }

  async getMyReviews() {
    const employee = await this.currentEmployee.resolve();
    return this.client.performanceReview.findMany({
      where: { employeeId: employee.id },
      include: { reviewCycle: true },
      orderBy: { reviewCycle: { startDate: 'desc' } },
    });
  }
}
