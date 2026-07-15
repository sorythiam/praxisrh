-- CreateEnum
CREATE TYPE "IpmCardStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "IpmDependentRelationship" AS ENUM ('CONJOINT', 'ENFANT', 'AUTRE');

-- CreateEnum
CREATE TYPE "IpmCapCategory" AS ENUM ('DENTAIRE', 'OPTIQUE', 'HOSPITALISATION', 'PHARMACIE', 'AUTRE');

-- CreateEnum
CREATE TYPE "IpmCaseStatus" AS ENUM ('SUBMITTED', 'PENDING_MEDICAL_REVIEW', 'APPROVED', 'REJECTED', 'PAID');

-- AlterTable
ALTER TABLE "ipm_beneficiaries" DROP COLUMN "isActive",
DROP COLUMN "personId",
ADD COLUMN     "cardStatus" "IpmCardStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "coverageRatePercent" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT,
ALTER COLUMN "employeeId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ipm_contributions" DROP COLUMN "baseFcfa",
DROP COLUMN "employeeId",
DROP COLUMN "rate",
ADD COLUMN     "assietteFcfa" INTEGER NOT NULL,
ADD COLUMN     "beneficiaryId" TEXT NOT NULL,
ADD COLUMN     "grossSalaryFcfa" INTEGER NOT NULL,
ADD COLUMN     "ratePercent" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DUE';

-- AlterTable
ALTER TABLE "ipm_providers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "ipm_reimbursement_cases" ADD COLUMN     "category" "IpmCapCategory" NOT NULL,
ADD COLUMN     "dependentId" TEXT,
ADD COLUMN     "documentUrls" JSONB,
ADD COLUMN     "invoiceNumber" TEXT NOT NULL,
ADD COLUMN     "justifiesAbsenceFrom" TIMESTAMP(3),
ADD COLUMN     "justifiesAbsenceTo" TIMESTAMP(3),
ADD COLUMN     "linkedLeaveRequestId" TEXT,
ADD COLUMN     "paymentTransactionId" TEXT,
ADD COLUMN     "providerName" TEXT,
ADD COLUMN     "rejectionReasonCode" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "IpmCaseStatus" NOT NULL DEFAULT 'SUBMITTED';

-- CreateTable
CREATE TABLE "ipm_dependents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "relationship" "IpmDependentRelationship" NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipm_dependents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipm_tariffs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "actCode" TEXT NOT NULL,
    "actLabel" TEXT NOT NULL,
    "tariffFcfa" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipm_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipm_annual_caps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "IpmCapCategory" NOT NULL,
    "annualCapFcfa" INTEGER NOT NULL,

    CONSTRAINT "ipm_annual_caps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ipm_dependents_tenantId_idx" ON "ipm_dependents"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ipm_dependents_tenantId_cardNumber_key" ON "ipm_dependents"("tenantId", "cardNumber");

-- CreateIndex
CREATE INDEX "ipm_tariffs_tenantId_idx" ON "ipm_tariffs"("tenantId");

-- CreateIndex
CREATE INDEX "ipm_annual_caps_tenantId_idx" ON "ipm_annual_caps"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ipm_annual_caps_tenantId_category_key" ON "ipm_annual_caps"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ipm_beneficiaries_employeeId_key" ON "ipm_beneficiaries"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ipm_contributions_beneficiaryId_periodYear_periodMonth_key" ON "ipm_contributions"("beneficiaryId", "periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ipm_reimbursement_cases_paymentTransactionId_key" ON "ipm_reimbursement_cases"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ipm_reimbursement_cases_tenantId_beneficiaryId_invoiceNumbe_key" ON "ipm_reimbursement_cases"("tenantId", "beneficiaryId", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "ipm_beneficiaries" ADD CONSTRAINT "ipm_beneficiaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipm_dependents" ADD CONSTRAINT "ipm_dependents_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "ipm_beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipm_contributions" ADD CONSTRAINT "ipm_contributions_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "ipm_beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipm_tariffs" ADD CONSTRAINT "ipm_tariffs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ipm_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipm_reimbursement_cases" ADD CONSTRAINT "ipm_reimbursement_cases_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "ipm_beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

