-- CreateEnum
CREATE TYPE "InterimMissionStatus" AS ENUM ('ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterimAssignmentStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "InterimTimesheetStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InterimIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "InterimInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID');

-- AlterTable
ALTER TABLE "interim_advances" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "paymentTransactionId" TEXT;

-- AlterTable
ALTER TABLE "interim_assignments" ADD COLUMN     "status" "InterimAssignmentStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "interim_missions" ADD COLUMN     "clientContactEmail" TEXT,
ADD COLUMN     "clientContactName" TEXT,
ADD COLUMN     "clientContactPhone" TEXT,
ADD COLUMN     "siteQrToken" TEXT NOT NULL,
ADD COLUMN     "status" "InterimMissionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "interim_timesheets" DROP COLUMN "clientApproved",
ADD COLUMN     "clockInLatitude" DOUBLE PRECISION,
ADD COLUMN     "clockInLongitude" DOUBLE PRECISION,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "selfieUrl" TEXT,
ADD COLUMN     "siteQrVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "InterimTimesheetStatus" NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedByName" TEXT,
ADD COLUMN     "validationToken" TEXT;

-- CreateTable
CREATE TABLE "interim_incidents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "missionId" TEXT,
    "description" TEXT NOT NULL,
    "severity" "InterimIncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "reportedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interim_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interim_blacklist_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blacklistedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" TIMESTAMP(3),
    "liftedReason" TEXT,

    CONSTRAINT "interim_blacklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interim_proforma_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "totalAmountFcfa" INTEGER NOT NULL,
    "status" "InterimInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interim_proforma_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interim_incidents_tenantId_idx" ON "interim_incidents"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "interim_blacklist_entries_employeeId_key" ON "interim_blacklist_entries"("employeeId");

-- CreateIndex
CREATE INDEX "interim_blacklist_entries_tenantId_idx" ON "interim_blacklist_entries"("tenantId");

-- CreateIndex
CREATE INDEX "interim_proforma_invoices_tenantId_idx" ON "interim_proforma_invoices"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "interim_advances_paymentTransactionId_key" ON "interim_advances"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "interim_timesheets_validationToken_key" ON "interim_timesheets"("validationToken");

-- CreateIndex
CREATE UNIQUE INDEX "interim_timesheets_assignmentId_date_key" ON "interim_timesheets"("assignmentId", "date");

-- AddForeignKey
ALTER TABLE "interim_assignments" ADD CONSTRAINT "interim_assignments_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "interim_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_assignments" ADD CONSTRAINT "interim_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_timesheets" ADD CONSTRAINT "interim_timesheets_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "interim_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_advances" ADD CONSTRAINT "interim_advances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_incidents" ADD CONSTRAINT "interim_incidents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_incidents" ADD CONSTRAINT "interim_incidents_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "interim_missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_blacklist_entries" ADD CONSTRAINT "interim_blacklist_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_proforma_invoices" ADD CONSTRAINT "interim_proforma_invoices_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "interim_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

