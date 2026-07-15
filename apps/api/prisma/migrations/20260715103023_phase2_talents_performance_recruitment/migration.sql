-- CreateEnum
CREATE TYPE "PosteInterneStatus" AS ENUM ('OPEN', 'FILLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PosteInterneApplicationStatus" AS ENUM ('INTERESSE', 'EN_EVALUATION', 'RETENU', 'REJETE');

-- CreateEnum
CREATE TYPE "SuccessionReadiness" AS ENUM ('READY_NOW', 'READY_1_2_YEARS', 'READY_3_5_YEARS', 'DEVELOPING');

-- CreateEnum
CREATE TYPE "ObjectiveType" AS ENUM ('INDIVIDUAL', 'TEAM');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('PEER', 'MANAGER', 'SELF');

-- CreateEnum
CREATE TYPE "ReviewCycleStatus" AS ENUM ('OPEN', 'CALIBRATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED');

-- CreateTable
CREATE TABLE "competences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_competences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_competences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postes_internes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "isKeyRole" BOOLEAN NOT NULL DEFAULT false,
    "status" "PosteInterneStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postes_internes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poste_interne_requirements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "posteInterneId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "requiredLevel" INTEGER NOT NULL,

    CONSTRAINT "poste_interne_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poste_interne_applications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "posteInterneId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "PosteInterneApplicationStatus" NOT NULL DEFAULT 'INTERESSE',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poste_interne_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "targetPosteInterneId" TEXT,
    "goals" TEXT NOT NULL,
    "recommendedActions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "development_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "succession_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "posteInterneId" TEXT NOT NULL,
    "currentHolderEmployeeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "succession_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "succession_candidates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "successionPlanId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "readiness" "SuccessionReadiness" NOT NULL DEFAULT 'DEVELOPING',
    "notes" TEXT,

    CONSTRAINT "succession_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objectives" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT,
    "teamName" TEXT,
    "type" "ObjectiveType" NOT NULL,
    "title" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_results" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,

    CONSTRAINT "key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toEmployeeId" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_cycles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ReviewCycleStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "review_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewCycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "selfScore" DOUBLE PRECISION,
    "managerScore" DOUBLE PRECISION,
    "managerComments" TEXT,
    "calibratedScore" DOUBLE PRECISION,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "establishmentId" TEXT,
    "description" TEXT,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'APPLIED',
    "recruiterUserId" TEXT,
    "hiredEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions_formation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "durationHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_enrollments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "actionFormationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "completedAt" TIMESTAMP(3),
    "certificationExpiresAt" TIMESTAMP(3),

    CONSTRAINT "formation_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquetes_engagement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquetes_engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pulse_survey_responses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "teamName" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pulse_survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competences_tenantId_idx" ON "competences"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "competences_tenantId_name_key" ON "competences"("tenantId", "name");

-- CreateIndex
CREATE INDEX "employee_competences_tenantId_idx" ON "employee_competences"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_competences_employeeId_competenceId_key" ON "employee_competences"("employeeId", "competenceId");

-- CreateIndex
CREATE INDEX "postes_internes_tenantId_idx" ON "postes_internes"("tenantId");

-- CreateIndex
CREATE INDEX "poste_interne_requirements_tenantId_idx" ON "poste_interne_requirements"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "poste_interne_requirements_posteInterneId_competenceId_key" ON "poste_interne_requirements"("posteInterneId", "competenceId");

-- CreateIndex
CREATE INDEX "poste_interne_applications_tenantId_idx" ON "poste_interne_applications"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "poste_interne_applications_posteInterneId_employeeId_key" ON "poste_interne_applications"("posteInterneId", "employeeId");

-- CreateIndex
CREATE INDEX "development_plans_tenantId_idx" ON "development_plans"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "succession_plans_posteInterneId_key" ON "succession_plans"("posteInterneId");

-- CreateIndex
CREATE INDEX "succession_plans_tenantId_idx" ON "succession_plans"("tenantId");

-- CreateIndex
CREATE INDEX "succession_candidates_tenantId_idx" ON "succession_candidates"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "succession_candidates_successionPlanId_employeeId_key" ON "succession_candidates"("successionPlanId", "employeeId");

-- CreateIndex
CREATE INDEX "objectives_tenantId_idx" ON "objectives"("tenantId");

-- CreateIndex
CREATE INDEX "key_results_tenantId_idx" ON "key_results"("tenantId");

-- CreateIndex
CREATE INDEX "feedback_entries_tenantId_idx" ON "feedback_entries"("tenantId");

-- CreateIndex
CREATE INDEX "feedback_entries_tenantId_toEmployeeId_idx" ON "feedback_entries"("tenantId", "toEmployeeId");

-- CreateIndex
CREATE INDEX "review_cycles_tenantId_idx" ON "review_cycles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "review_cycles_tenantId_periodLabel_key" ON "review_cycles"("tenantId", "periodLabel");

-- CreateIndex
CREATE INDEX "performance_reviews_tenantId_idx" ON "performance_reviews"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_reviewCycleId_employeeId_key" ON "performance_reviews"("reviewCycleId", "employeeId");

-- CreateIndex
CREATE INDEX "job_postings_tenantId_idx" ON "job_postings"("tenantId");

-- CreateIndex
CREATE INDEX "candidates_tenantId_idx" ON "candidates"("tenantId");

-- CreateIndex
CREATE INDEX "job_applications_tenantId_idx" ON "job_applications"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_jobPostingId_candidateId_key" ON "job_applications"("jobPostingId", "candidateId");

-- CreateIndex
CREATE INDEX "actions_formation_tenantId_idx" ON "actions_formation"("tenantId");

-- CreateIndex
CREATE INDEX "formation_enrollments_tenantId_idx" ON "formation_enrollments"("tenantId");

-- CreateIndex
CREATE INDEX "enquetes_engagement_tenantId_idx" ON "enquetes_engagement"("tenantId");

-- CreateIndex
CREATE INDEX "pulse_survey_responses_tenantId_idx" ON "pulse_survey_responses"("tenantId");

-- AddForeignKey
ALTER TABLE "competences" ADD CONSTRAINT "competences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_competences" ADD CONSTRAINT "employee_competences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_competences" ADD CONSTRAINT "employee_competences_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postes_internes" ADD CONSTRAINT "postes_internes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poste_interne_requirements" ADD CONSTRAINT "poste_interne_requirements_posteInterneId_fkey" FOREIGN KEY ("posteInterneId") REFERENCES "postes_internes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poste_interne_requirements" ADD CONSTRAINT "poste_interne_requirements_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poste_interne_applications" ADD CONSTRAINT "poste_interne_applications_posteInterneId_fkey" FOREIGN KEY ("posteInterneId") REFERENCES "postes_internes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poste_interne_applications" ADD CONSTRAINT "poste_interne_applications_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_targetPosteInterneId_fkey" FOREIGN KEY ("targetPosteInterneId") REFERENCES "postes_internes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_plans" ADD CONSTRAINT "succession_plans_posteInterneId_fkey" FOREIGN KEY ("posteInterneId") REFERENCES "postes_internes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_candidates" ADD CONSTRAINT "succession_candidates_successionPlanId_fkey" FOREIGN KEY ("successionPlanId") REFERENCES "succession_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_candidates" ADD CONSTRAINT "succession_candidates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "review_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
