# Architecture

## Core + modules

The spec's founding architectural principle (section 5.1) is that a
shared **Core** carries the tenant registry, auth, module activation and
cross-cutting services, so that adding a module for an existing client is
an extension, never a migration. This repo follows that split literally
in the source tree:

```
apps/api/src/core/       Tenant/auth/RBAC/module-activation/notifications/payouts/rules/storage/audit — shared by every module
apps/api/src/rh/         Praxis RH — fully implemented (Phase 1)
apps/api/src/ipm/        Praxis IPM — scaffold only (Phase 3, see below)
apps/api/src/interim/    Pack Intérim — scaffold only (Phase 4, see below)
```

`ModuleCode` (`RH | IPM | INTERIM`) drives everything: which modules a
tenant sees in the subscription flow, which routes `ModuleGuard` allows a
request through to, and which Prisma models exist. Adding a country is a
data change (`CountryRuleSet` row), not a code change; adding a module
follows the same idea.

## Why IPM and Pack Intérim are "present but not built"

The roadmap in the spec (section 13) is explicit that Praxis RH must be
built completely before IPM, and IPM before Pack Intérim — a module isn't
"done" until the whole vertical (self-service portal, offline
timeclock, payroll, distribution, mobile money) works end to end for it,
rather than three shallow modules built in parallel. This repo honors
that ordering: Phase 1 (Core + Praxis RH) is complete and tested end to
end; IPM and Pack Intérim are deliberately scoped out of this pass.

What "present" means concretely, so activating either module later is an
extension and not a rewrite:

- Every entity from the spec's conceptual data model (section 11) for
  both modules already exists in `prisma/schema.prisma` — `IpmBeneficiary`,
  `IpmContribution`, `IpmProvider`, `IpmReimbursementCase`,
  `InterimMission`, `InterimAssignment`, `InterimTimesheet`,
  `InterimAdvance` — with `tenantId` columns and Row-Level Security
  applied identically to the RH tables (`prisma/rls.sql`).
- `ModuleGuard`, the subscription flow, and pricing (`packages/shared/src/modules.ts`)
  already know about all three modules, including the Pack Intérim → RH
  dependency rule from section 4.4 (enforced in `AuthService.subscribe`
  and in the `/subscribe` UI).
- `src/ipm/ipm.controller.ts` and `src/interim/interim.controller.ts` are
  minimal, correctly-gated placeholder controllers: they prove the
  module-activation mechanism works for these modules today (a tenant
  without IPM gets a 403; a tenant with IPM gets a 200), without
  pretending any business logic exists yet.

Building out either module means: implementing the services/controllers
in `src/ipm` or `src/interim` against the existing schema, wiring the
interconnection points from section 10 (shared PaymentTransaction/
PayoutsService, contract-status → coverage-status triggers) which the
Core already supports, and building the corresponding Next.js screens.

## Tenant isolation

See the README section — this doc only adds the "why two layers"
reasoning. The Prisma Client Extension is what's actually exercised by
every request and is unit-testable in isolation; PostgreSQL RLS is what
protects the data if that extension is ever bypassed (a raw query, a
future contributor forgetting to go through `TenantPrismaService`, a
compromised credential). Neither layer alone would meet the spec's
"tests automatisés systématiques garantissant qu'aucune requête ne peut
franchir la frontière d'un tenant" (section 5.4) — together they do.

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

## What's deliberately out of scope for Phase 1

Per the user's explicit scoping decision for this build: Phase 2 of the
roadmap (talents/évolution de carrière, OKR, recrutement, formation,
engagement, and the AI features from section 7 beyond anomaly
detection) is not implemented. Adding it means new `rh/talents`,
`rh/performance`, `rh/recruitment` etc. modules following the same
Core/module pattern — no changes to the tenant isolation or auth
mechanisms are needed to add them.
