import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { CurrentEmployeeService } from '../common/current-employee.service';
import {
  AddSuccessionCandidateDto,
  CreatePosteInterneDto,
  CreateSuccessionPlanDto,
  SetEmployeeCompetencesDto,
  UpsertDevelopmentPlanDto,
} from './dto/talents.dto';

interface EligibilityResult {
  posteInterneId: string;
  matchPercent: number;
  metRequirements: number;
  totalRequirements: number;
  missing: Array<{ competenceId: string; competenceName: string; requiredLevel: number; currentLevel: number }>;
}

@Injectable()
export class TalentsService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private audit: AuditService,
    private currentEmployee: CurrentEmployeeService,
  ) {}

  private get client() {
    return this.tenantPrisma.client as any;
  }

  // -- Competence catalogue --

  listCompetences() {
    return this.client.competence.findMany({ orderBy: { name: 'asc' } });
  }

  createCompetence(dto: { name: string; category?: string }) {
    return this.client.competence.create({ data: dto });
  }

  // -- Employee skills mapping (section 6.12) --

  getEmployeeCompetences(employeeId: string) {
    return this.client.employeeCompetence.findMany({
      where: { employeeId },
      include: { competence: true },
      orderBy: { competence: { name: 'asc' } },
    });
  }

  async setEmployeeCompetences(employeeId: string, dto: SetEmployeeCompetencesDto) {
    const results = [];
    for (const entry of dto.entries) {
      results.push(
        await this.client.employeeCompetence.upsert({
          where: { employeeId_competenceId: { employeeId, competenceId: entry.competenceId } },
          update: { level: entry.level, assessedAt: new Date() },
          create: { employeeId, competenceId: entry.competenceId, level: entry.level },
        }),
      );
    }
    await this.audit.log({
      action: 'EMPLOYEE_COMPETENCES_UPDATED',
      entityType: 'Employee',
      entityId: employeeId,
      after: { count: results.length },
    });
    return results;
  }

  async getMyCompetences() {
    const employee = await this.currentEmployee.resolve();
    return this.getEmployeeCompetences(employee.id);
  }

  // -- Internal postings / mobility marketplace (section 6.12) --

  /**
   * Deliberately two top-level calls instead of a nested
   * `requirements: { create: [...] }` write: the tenant-scoping
   * extension intercepts top-level Prisma operations only, so a nested
   * write for a tenant-scoped child model would reach the database
   * without its `tenantId` ever being injected (and fail loudly on the
   * NOT NULL constraint, per fail-closed rather than fail-open — no data
   * leaked, but worth avoiding). Two calls through the same enforced
   * client keeps every write on the one code path that's proven safe.
   */
  async createPoste(dto: CreatePosteInterneDto) {
    const poste = await this.client.posteInterne.create({
      data: {
        title: dto.title,
        department: dto.department,
        isKeyRole: dto.isKeyRole ?? false,
        description: dto.description,
      },
    });
    if (dto.requirements.length > 0) {
      await this.client.posteInterneRequirement.createMany({
        data: dto.requirements.map((r) => ({ posteInterneId: poste.id, competenceId: r.competenceId, requiredLevel: r.requiredLevel })),
      });
    }
    return this.getPoste(poste.id);
  }

  listPostes(onlyOpen = false) {
    return this.client.posteInterne.findMany({
      where: onlyOpen ? { status: 'OPEN' } : undefined,
      include: { requirements: { include: { competence: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPoste(id: string) {
    const poste = await this.client.posteInterne.findUnique({
      where: { id },
      include: { requirements: { include: { competence: true } } },
    });
    if (!poste) throw new BadRequestException('Poste introuvable.');
    return poste;
  }

  /**
   * Deterministic, explainable eligibility scoring — no ML model,
   * consistent with the anomaly-detection approach elsewhere in this
   * codebase: every number is traceable to which competencies matched
   * and which didn't, per the acceptance criteria in section 6.12
   * ("compétences manquantes identifiées").
   */
  private async computeEligibility(posteId: string, employeeId: string): Promise<EligibilityResult> {
    const [poste, employeeCompetences] = await Promise.all([
      this.getPoste(posteId),
      this.client.employeeCompetence.findMany({ where: { employeeId } }),
    ]);
    const levelByCompetence = new Map<string, number>(employeeCompetences.map((ec: any) => [ec.competenceId, ec.level]));

    let met = 0;
    const missing: EligibilityResult['missing'] = [];
    for (const req of poste.requirements) {
      const currentLevel = levelByCompetence.get(req.competenceId) ?? 0;
      if (currentLevel >= req.requiredLevel) {
        met++;
      } else {
        missing.push({
          competenceId: req.competenceId,
          competenceName: req.competence.name,
          requiredLevel: req.requiredLevel,
          currentLevel,
        });
      }
    }
    const total = poste.requirements.length;
    return {
      posteInterneId: posteId,
      matchPercent: total > 0 ? Math.round((met / total) * 100) : 100,
      metRequirements: met,
      totalRequirements: total,
      missing,
    };
  }

  async getMyEligiblePostes() {
    const employee = await this.currentEmployee.resolve();
    const postes = await this.client.posteInterne.findMany({
      where: { status: 'OPEN' },
      include: { requirements: { include: { competence: true } } },
    });
    const withEligibility = await Promise.all(
      postes.map(async (p: any) => ({ poste: p, eligibility: await this.computeEligibility(p.id, employee.id) })),
    );
    return withEligibility.sort((a, b) => b.eligibility.matchPercent - a.eligibility.matchPercent);
  }

  async applyToPoste(posteId: string, message?: string) {
    const employee = await this.currentEmployee.resolve();
    const existing = await this.client.posteInterneApplication.findFirst({ where: { posteInterneId: posteId, employeeId: employee.id } });
    if (existing) {
      throw new BadRequestException('Vous êtes déjà positionné(e) sur ce poste.');
    }
    return this.client.posteInterneApplication.create({
      data: { posteInterneId: posteId, employeeId: employee.id, message },
    });
  }

  listApplications(posteId: string) {
    return this.client.posteInterneApplication.findMany({
      where: { posteInterneId: posteId },
      include: { employee: { include: { person: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decideApplication(applicationId: string, status: 'EN_EVALUATION' | 'RETENU' | 'REJETE') {
    const before = await this.client.posteInterneApplication.findUnique({ where: { id: applicationId } });
    const application = await this.client.posteInterneApplication.update({
      where: { id: applicationId },
      data: { status },
    });
    await this.audit.log({
      action: 'POSTE_APPLICATION_DECISION',
      entityType: 'PosteInterneApplication',
      entityId: applicationId,
      before,
      after: application,
    });
    return application;
  }

  // -- Individual development plans (section 6.12) --

  async upsertDevelopmentPlan(employeeId: string, dto: UpsertDevelopmentPlanDto) {
    const existing = await this.client.developmentPlan.findFirst({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
    if (existing) {
      return this.client.developmentPlan.update({
        where: { id: existing.id },
        data: {
          goals: dto.goals,
          targetPosteInterneId: dto.targetPosteInterneId,
          recommendedActions: dto.recommendedActions,
          lastReviewedAt: new Date(),
        },
      });
    }
    return this.client.developmentPlan.create({
      data: {
        employeeId,
        goals: dto.goals,
        targetPosteInterneId: dto.targetPosteInterneId,
        recommendedActions: dto.recommendedActions,
      },
    });
  }

  /**
   * "Chaque évaluation alimente automatiquement le module Talents" —
   * section 6.13's acceptance criteria for the Performance module.
   * Called by PerformanceService after a review is recorded; appends a
   * traceable note rather than silently rewriting the plan, so the
   * employee/DRH sees exactly why it changed.
   */
  async appendNoteFromReview(employeeId: string, note: string) {
    const existing = await this.client.developmentPlan.findFirst({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
    const priorActions = Array.isArray(existing?.recommendedActions) ? existing.recommendedActions : [];
    const recommendedActions = [...priorActions, { label: note, type: 'REVIEW_FOLLOW_UP' }];
    if (existing) {
      return this.client.developmentPlan.update({ where: { id: existing.id }, data: { recommendedActions, lastReviewedAt: new Date() } });
    }
    return this.client.developmentPlan.create({
      data: { employeeId, goals: 'À définir suite à l’évaluation de performance.', recommendedActions },
    });
  }

  getEmployeeDevelopmentPlan(employeeId: string) {
    return this.client.developmentPlan.findFirst({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { targetPosteInterne: true },
    });
  }

  async getMyDevelopmentPlan() {
    const employee = await this.currentEmployee.resolve();
    return this.getEmployeeDevelopmentPlan(employee.id);
  }

  /** Suggests goals from the closest-matching poste the employee isn't yet eligible for. */
  async suggestDevelopmentPlan(employeeId: string) {
    const postes = await this.client.posteInterne.findMany({
      where: { status: 'OPEN' },
      include: { requirements: { include: { competence: true } } },
    });
    const scored = await Promise.all(
      postes.map(async (p: any) => ({ poste: p, eligibility: await this.computeEligibility(p.id, employeeId) })),
    );
    const best = scored
      .filter((s) => s.eligibility.matchPercent < 100)
      .sort((a, b) => b.eligibility.matchPercent - a.eligibility.matchPercent)[0];
    if (!best) {
      return { targetPosteInterneId: null, goals: '', recommendedActions: [] };
    }
    return {
      targetPosteInterneId: best.poste.id,
      goals: `Se préparer au poste "${best.poste.title}" (${best.eligibility.matchPercent}% des compétences requises déjà acquises).`,
      recommendedActions: best.eligibility.missing.map((m: any) => ({
        label: `Monter en compétence "${m.competenceName}" (niveau ${m.currentLevel} → ${m.requiredLevel})`,
        type: 'COMPETENCE_GAP',
      })),
    };
  }

  // -- Succession planning for key roles (section 6.12) --

  async createSuccessionPlan(posteId: string, dto: CreateSuccessionPlanDto) {
    const poste = await this.getPoste(posteId);
    if (!poste.isKeyRole) {
      throw new BadRequestException("Ce poste n'est pas marqué comme poste clé.");
    }
    return this.client.successionPlan.upsert({
      where: { posteInterneId: posteId },
      update: { currentHolderEmployeeId: dto.currentHolderEmployeeId, notes: dto.notes },
      create: { posteInterneId: posteId, currentHolderEmployeeId: dto.currentHolderEmployeeId, notes: dto.notes },
    });
  }

  /**
   * Returns `null` rather than throwing when no plan exists yet — for a
   * freshly created key role that's the expected state, not an error,
   * and the frontend treats "no plan" and "show the create button" as
   * the same case.
   */
  async getSuccessionPlan(posteId: string) {
    const plan = await this.client.successionPlan.findUnique({
      where: { posteInterneId: posteId },
      include: { candidates: { include: { employee: { include: { person: true } } } } },
    });
    return plan;
    return plan;
  }

  async addSuccessionCandidate(successionPlanId: string, dto: AddSuccessionCandidateDto) {
    return this.client.successionCandidate.upsert({
      where: { successionPlanId_employeeId: { successionPlanId, employeeId: dto.employeeId } },
      update: { readiness: dto.readiness, notes: dto.notes },
      create: { successionPlanId, employeeId: dto.employeeId, readiness: dto.readiness, notes: dto.notes },
    });
  }

  /** Ranks all active employees by competence match against a key poste's requirements — a starting point for the DRH, not a decision. */
  async suggestSuccessionCandidates(posteId: string) {
    const poste = await this.getPoste(posteId);
    const employees = await this.client.employee.findMany({
      where: { status: 'ACTIVE' },
      include: { person: true },
    });
    const scored = await Promise.all(
      employees.map(async (e: any) => ({ employee: e, eligibility: await this.computeEligibility(posteId, e.id) })),
    );
    return scored
      .filter((s) => s.eligibility.matchPercent > 0)
      .sort((a, b) => b.eligibility.matchPercent - a.eligibility.matchPercent)
      .slice(0, 10);
  }
}
