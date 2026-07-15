# Architecture

## Core + modules

The spec's founding architectural principle (section 5.1) is that a
shared **Core** carries the tenant registry, auth, module activation and
cross-cutting services, so that adding a module for an existing client is
an extension, never a migration. This repo follows that split literally
in the source tree:

```
apps/api/src/core/       Tenant/auth/RBAC/module-activation/notifications/payouts/rules/storage/audit — shared by every module
apps/api/src/rh/         Praxis RH — fully implemented (Phase 1 + Phase 2)
apps/api/src/ipm/        Praxis IPM — fully implemented (Phase 3, see below)
apps/api/src/interim/    Pack Intérim — scaffold only (Phase 4, see below)
```

`ModuleCode` (`RH | IPM | INTERIM`) drives everything: which modules a
tenant sees in the subscription flow, which routes `ModuleGuard` allows a
request through to, and which Prisma models exist. Adding a country is a
data change (`CountryRuleSet` row), not a code change; adding a module
follows the same idea.

## Why Pack Intérim is still "present but not built"

The roadmap in the spec (section 13) is explicit that Praxis RH must be
built completely before IPM, and IPM before Pack Intérim — a module isn't
"done" until the whole vertical (self-service portal, offline
timeclock, payroll, distribution, mobile money) works end to end for it,
rather than three shallow modules built in parallel. This repo honors
that ordering: Phase 1 (Core + Praxis RH), Phase 2 (talents/performance/
recruitment) and Phase 3 (Praxis IPM) are complete and tested end to end;
Pack Intérim is the one still deliberately scoped out.

What "present" means concretely for Pack Intérim, so activating it later
is an extension and not a rewrite:

- Every entity from the spec's conceptual data model (section 11) already
  exists in `prisma/schema.prisma` — `InterimMission`, `InterimAssignment`,
  `InterimTimesheet`, `InterimAdvance` — with `tenantId` columns and
  Row-Level Security applied identically to the RH/IPM tables
  (`prisma/rls.sql`).
- `ModuleGuard`, the subscription flow, and pricing
  (`packages/shared/src/modules.ts`) already know about all three
  modules, including the Pack Intérim → RH dependency rule from section
  4.4 (enforced in `AuthService.subscribe` and in the `/subscribe` UI).
- `src/interim/interim.controller.ts` is a minimal, correctly-gated
  placeholder controller: it proves the module-activation mechanism
  works for this module today (a tenant without INTERIM gets a 403; a
  tenant with INTERIM gets a 200), without pretending any business logic
  exists yet.

Building out the module means: implementing the services/controllers in
`src/interim` against the existing schema, wiring the RH↔Intérim/IPM
interconnection points from section 10 (shared PaymentTransaction/
PayoutsService, contract-status → coverage-status triggers) which the
Core already supports (Praxis IPM already reuses both), and building the
corresponding Next.js screens.

## Tenant isolation

See the README section — this doc only adds the "why two layers"
reasoning. The Prisma Client Extension is what's actually exercised by
every request and is unit-testable in isolation; PostgreSQL RLS is what
protects the data if that extension is ever bypassed (a raw query, a
future contributor forgetting to go through `TenantPrismaService`, a
compromised credential). Neither layer alone would meet the spec's
"tests automatisés systématiques garantissant qu'aucune requête ne peut
franchir la frontière d'un tenant" (section 5.4) — together they do,
and `apps/api/test/tenant-isolation.e2e-spec.ts` is exactly that
automated proof: it exercises the HTTP layer, module gating, and RLS
independently, including a raw-SQL check with no application code
involved at all. Run it with `npm run test:e2e --workspace=apps/api`.

## Payroll

`src/rh/payroll/payroll.service.ts` generates a report per (tenant,
year, month) directly from `Shift`/`ClockEvent` (planned vs. actual
hours) and each employee's active `Contract`, applying the active
`CountryRuleSet` for overtime multipliers, social contributions and
income tax brackets — no manual re-entry of variables, per section 6.5.
Anomaly detection (section 7.3) is deterministic and explainable rather
than a model: a flag always states which rule fired and why, which is
what the spec's acceptance criteria require ("chaque alerte explique la
raison de la détection").

## Phase 2 — talents, performance, recruitment

Built on top of Phase 1 with no changes to the tenant isolation or auth
mechanisms — `src/rh/talents`, `src/rh/performance` and
`src/rh/recruitment` are ordinary RH sub-modules gated by the same
`ModuleCode.RH` as everything else:

- **Talents** (section 6.12): a `Competence` catalogue, per-employee
  skill levels, an internal-mobility marketplace (`PosteInterne` with
  required competencies an employee can apply to), individual
  development plans, and succession planning for key roles. Eligibility
  and succession-candidate ranking are deterministic, explainable
  competence-match percentages — same philosophy as payroll anomaly
  detection (section 7.3): every number traces to which competencies
  matched and which didn't, not an opaque model score.
- **Performance/OKR** (6.13): objectives with key results, continuous
  peer/manager/self feedback with no artificial history limit (the spec
  explicitly calls out wanting the full history at review time, not
  just the last three months), and review cycles with a calibration
  step. `PerformanceService.upsertReview` calls
  `TalentsService.appendNoteFromReview` when a manager leaves comments —
  the concrete implementation of the spec's "chaque évaluation alimente
  automatiquement le module Talents" requirement.
- **Recruitment/ATS** (6.14): job postings and a candidate pipeline.
  `RecruitmentService.hire` calls `EmployeesService.create` directly
  with the candidate's name/email/phone already on file — the same
  "sans aucune ressaisie" guarantee the spec calls for, achieved by
  reuse rather than a parallel employee-creation code path.

## Formation and Engagement — schema present, not built

`ActionFormation`/`FormationEnrollment` (6.15) and
`EnqueteEngagement`/`PulseSurveyResponse` (6.16) exist in
`prisma/schema.prisma`, tenant-scoped and RLS-protected like everything
else, but have no service or controller yet. Unlike IPM/Pack Intérim,
these aren't separate `ModuleCode`s — they're RH sub-features that would
be gated by the same `ModuleCode.RH` already exercised by every other
RH endpoint, so a placeholder controller here wouldn't prove anything
new the way `src/interim/interim.controller.ts` proves cross-module
gating. The integration point is already in place:
`DevelopmentPlan.recommendedActions` (Talents) is exactly where a
built-out Formation module would plug in concrete training
recommendations instead of free-text labels.

## Phase 3 — Praxis IPM

`src/ipm` is a fully implemented module (`beneficiaries`, `contributions`,
`providers`, `reimbursements`, `dashboard`), gated end to end by
`ModuleCode.IPM` the same way Praxis RH is gated by `ModuleCode.RH`. It
is also where four of the spec's five RH↔IPM interconnections (section
10) actually live in code, not just in the schema:

- **10.1 — cotisations fed by real payroll**: `ContributionsService.generate`
  reads `PayslipLine.grossSalaryFcfa` from the RH `PayrollReport` for the
  period rather than re-deriving salary independently, and skips (rather
  than silently defaulting) any beneficiary whose payroll for that period
  hasn't been generated yet.
- **10.2 — contract status → coverage status**: modeled as a computed
  value, not a push. `computeEffectiveCardStatus` (`src/ipm/ipm-common.ts`)
  derives `SUSPENDED` on every read whenever the underlying employee's
  status is one of the employment-ended statuses, so a beneficiary's
  effective coverage can never go stale relative to their employment —
  there's no event bus or background job to keep in sync.
- **10.3 — medical justification reconciled with absence**: when a
  reimbursement case with absence dates is approved,
  `ReimbursementsService.approve` creates an already-approved `LeaveRequest`
  (type `MALADIE`) linked back to the case via `linkedLeaveRequestId`, so
  the employee's RH absence record and their IPM medical claim are the
  same fact instead of two records to reconcile by hand.
- **10.4 — consolidated payroll export**: `IpmDashboardService.exportConsolidatedPayroll`
  merges each employee's RH payslip line with their IPM `employeeShareFcfa`
  retenue into one CSV.
- **10.5 — shared mobile money payout**: `ReimbursementsService.pay` calls
  the same `PayoutsService.runBulkPayout` used by salary and advance
  payouts — reimbursements aren't a parallel payment path.

Two simplifications are deliberate and documented in the code where they
apply, rather than silently assumed:

- **No separate provider or médecin-conseil accounts.** The spec's
  provider-portal user story (8.3, "en tant que prestataire, je veux
  scanner...") and the médecin-conseil validation step (8.5) both assume
  a login this build doesn't have. `IPM_MANAGER` performs the provider
  eligibility check and both reimbursement validation steps today
  (`providers.controller.ts`, `reimbursements.service.ts`), with
  sensitive categories (`HOSPITALISATION`) still routed through a
  distinct second `PENDING_MEDICAL_REVIEW` state so the two-step
  workflow itself is real even though one role performs both steps.
- **ICAMO export is a representative format, not the official one.** No
  published ICAMO file specification was available while building
  `exportIcamoReport`; the columns are clearly labelled and traceable to
  real cotisation/prestation data, but the exact column set/ordering
  should be confirmed with ICAMO before any real regulatory filing.

The Next.js screens are under `apps/web/src/app/app/ipm` (manager admin:
adhérents, cotisations, prestataires, dossiers, dashboard/exports) and
`apps/web/src/app/app/me/ipm` (employee self-service: coverage card,
submit a reimbursement with a document upload, track dossier status).
