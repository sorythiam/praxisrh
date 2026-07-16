# Praxis

Plateforme SaaS multi-tenant de gestion des ressources humaines et de la
protection sociale pour l'Afrique de l'Ouest — Praxis RH, Praxis IPM et
Pack Intérim, modulaires et souscriptibles indépendamment.

This repository contains **Phases 1–4** of the roadmap, built to be real,
working code end to end (not a mockup): the multi-tenant core (auth,
roles, module activation, subscription) and a complete Praxis RH module
(employee lifecycle, planning, offline-first timeclock, leave, payroll
generation with a country-rules engine, payslip distribution, mobile
money payout) — **Phase 2's** people-development loop: talents &
internal mobility with competence-match eligibility scoring,
performance/OKR with continuous feedback and calibrated review cycles,
and a recruitment ATS whose hiring flow converts a candidate straight
into a full employee account with zero re-entry — **Phase 3, Praxis
IPM**: adherent/card lifecycle, cotisations generated from real Praxis RH
payroll, a provider network with a tiers-payant eligibility check,
reimbursement claims with duplicate-invoice and annual-plafond anti-fraud
enforcement plus a second medical-review step for sensitive acts, mobile
money payout through the same connector as salaries, and a sinistralité
dashboard with ICAMO/consolidated-payroll exports — and **Phase 4, Pack
Intérim**: missions with dual hourly rates, a field pointage with GPS +
selfie + site QR verification, a client-validation extranet that needs
no client login at all, incident reporting and assignment-blocking
blacklists, advances paid through the same connector as salaries, and
proforma invoicing computed only from client-approved hours. Phase 4
also onboards a second country (Côte d'Ivoire) into the country-rules
engine as pure configuration. Formation and Engagement are present in
the data model and module-activation system but not yet built out — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for what that means
concretely and [docs/ROADMAP.md](docs/ROADMAP.md) for what's left.

## Stack

- **Frontend**: Next.js (App Router) + Tailwind, PWA offline queue for the timeclock
- **Backend**: NestJS + Prisma + PostgreSQL (Row-Level Security)
- **Monorepo**: npm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- Self-hostable end to end via Docker Compose — see below.

## Quick start (local dev, without Docker)

Requires Node 20+, PostgreSQL 16, and a Postgres role that is **not**
superuser and does **not** have `BYPASSRLS` (otherwise Row-Level
Security is silently ignored — see `prisma/rls.sql`).

```bash
npm install

# Database
createdb praxis
cp apps/api/.env.example apps/api/.env   # then edit DATABASE_URL / JWT_SECRET
npm run prisma:migrate --workspace=apps/api
psql "$DATABASE_URL" -f apps/api/prisma/rls.sql
npm run prisma:seed --workspace=apps/api

# Run
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
```

Seed data creates one demo tenant (RH + IPM + Pack Intérim modules
active) with six accounts (password `Demo1234!` for all):
`admin@demo.praxis` (COMPANY_ADMIN), `drh@demo.praxis` (HR_ADMIN),
`manager@demo.praxis` (MANAGER), `employe@demo.praxis` (EMPLOYEE,
already an IPM adherent with a dependent and a submitted reimbursement
case, plus an intérim mission assignment with an approved timesheet, a
pending one, and a pending advance request to explore),
`ipm@demo.praxis` (IPM_MANAGER), and `interim@demo.praxis`
(INTERIM_MANAGER). The country-rules engine also ships a second country
(Côte d'Ivoire), selectable on the `/subscribe` page.

## Quick start (Docker Compose — self-hosted)

This is the path that matters for CDP Sénégal data-residency compliance:
everything — database, API, web app, uploaded/generated files — runs on
infrastructure you control, with no third-party SaaS dependency.

```bash
cp infra/.env.example infra/.env   # edit POSTGRES_PASSWORD and JWT_SECRET
docker compose -f infra/docker-compose.yml --env-file infra/.env up --build
```

The API container applies pending Prisma migrations and the RLS policy
script on every start (`apps/api/docker-entrypoint.sh`) — safe to re-run.
Run the seed script once, in the running container, if you want demo data:

```bash
docker compose -f infra/docker-compose.yml exec api npm run prisma:seed
```

Web app: http://localhost:3000 · API: http://localhost:4000/api

> Note: `docker build` itself couldn't run inside this development
> sandbox (outbound access to the Docker Hub CDN is blocked by the
> sandbox's network policy), but every step either Dockerfile performs
> was verified directly by reproducing each build stage's exact file
> layout and commands (`npm ci --ignore-scripts` with only the
> `package.json` files present, then `npm run build --workspace=...`
> for shared/api/web with full source) — all pass. Still worth a real
> `docker compose build` on first deploy.

## Deploying to Railway (API) + Vercel (web)

The API is NestJS, not Next.js — Vercel's zero-config story is built
around Next.js, so the pragmatic split is: **Vercel hosts `apps/web`**,
**Railway (or Render) hosts `apps/api`** plus a managed Postgres. No
code is different between this and the Docker/self-hosted path above;
same image, same migrations-on-boot entrypoint.

**API on Railway:**
1. New Railway project → add a Postgres plugin (`DATABASE_URL` is
   injected automatically once linked — don't set it by hand).
2. Add a service from this repo. Railway picks up `railway.json` at the
   repo root, which points it at `apps/api/Dockerfile` with the repo
   root as build context (the Dockerfile depends on `packages/shared`
   via an npm workspace, so it needs that full context — same reason
   `infra/docker-compose.yml` builds it the same way).
3. Set env vars (see `apps/api/.env.example`): `JWT_SECRET` (a real
   secret, not the placeholder), `WEB_ORIGIN` (the Vercel URL once you
   have it, comma-separated if you need more than one), `STORAGE_DIR`
   (e.g. `/data/storage`).
4. Attach a **Volume** mounted at whatever `STORAGE_DIR` points to.
   Without one, generated payslips/IPM documents/intérim selfies are
   lost on every redeploy — Railway's filesystem is ephemeral otherwise.
5. `docker-entrypoint.sh` runs `prisma migrate deploy` + applies
   `rls.sql` on every boot, so first deploy needs no manual migration
   step.

**Web on Vercel:**
1. Import the repo, Root Directory = `apps/web` (Vercel still runs
   `npm install` from the monorepo root when it detects npm workspaces,
   which is what makes `packages/shared`'s `postinstall` build it before
   `next build` runs — see `docs/ARCHITECTURE.md`).
2. Set `API_URL` (see `apps/web/.env.example`) to the Railway service's
   public URL — `next.config.js`'s rewrite proxies `/api/*` there, so no
   other frontend code needs to know the API's actual address.
3. Once you have the Vercel URL, go back and set it as `WEB_ORIGIN` on
   the Railway service so CORS allows it.

## Tests

```bash
npm run test:e2e --workspace=apps/api
```

Provisions a disposable `praxis_test` database, applies migrations and
RLS, then runs `test/tenant-isolation.e2e-spec.ts` — an automated proof
of the spec's non-negotiable isolation requirement (section 5.4), at
three layers: HTTP (tenant B can't list or fetch-by-id tenant A's data),
module gating (a tenant without a module gets refused, not shown an
empty screen), and database (a raw connection with no tenant session
variable set gets zero rows from a table that has data — proving RLS
holds even if the application layer is ever bypassed).

## Repository layout

```
apps/api/        NestJS API (see src/core for the multi-tenant engine, src/rh for Praxis RH)
apps/web/        Next.js frontend
packages/shared/ Types/enums/pricing/country-rules shared by both apps
infra/           docker-compose.yml + .env.example
docs/            Architecture notes and the phase 2-4 roadmap
```

## Tenant isolation

Isolation between client companies is the one non-negotiable requirement
in the spec. It's enforced in two layers — see the comments at the top
of `apps/api/prisma/schema.prisma`, `src/core/prisma/tenant-scoping.extension.ts`
and `apps/api/prisma/rls.sql` for the full detail:

1. **Application layer (primary)**: a Prisma Client Extension injects
   `tenantId` into every query against a tenant-scoped model automatically.
   No repository code ever hand-builds a `where` clause with `tenantId` —
   that entire class of bug is structurally impossible.
2. **Database layer (defense in depth)**: PostgreSQL Row-Level Security
   policies on every tenant-scoped table, keyed on a session variable the
   API sets for the duration of each request's transaction.

Module-level isolation (a tenant that hasn't subscribed to a module sees
none of its screens or data) is enforced by `ModuleGuard` on every
module-specific controller.
