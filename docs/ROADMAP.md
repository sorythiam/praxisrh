# Roadmap — phases 2 to 4

Phase 1 (this repository) delivers the multi-tenant core and a complete
Praxis RH module. Phase 2's people-development loop — talents,
performance/OKR, recruitment — is also built and tested. Phase 3
(Praxis IPM) and Phase 4 (Pack Intérim + second country) are also built
and tested end-to-end. What remains is Formation, Engagement, and the
AI services called out below — each still builds only on what's already
established, so none of it requires revisiting the tenant isolation,
auth, or module-activation mechanisms.

## Phase 2 — Praxis RH avancé (2–3 mois)

- ✅ **Talents & évolution de carrière** (section 6.12): skills mapping,
  internal mobility marketplace, individual development plans,
  succession planning for key roles — `src/rh/talents`.
- ✅ **Performance & OKR** (6.13): individual/team goals, continuous
  feedback, calibrated review cycles, feeding back into Talents —
  `src/rh/performance`.
- ✅ **Recrutement / ATS** (6.14): job postings, candidate pipeline,
  candidate → employee conversion re-using `EmployeesService.create`
  with zero re-entry — `src/rh/recruitment`.
- ⬜ **Formation** (6.15): catalogue, recommendations derived from the
  skills-gap data from Talents. Schema present
  (`ActionFormation`/`FormationEnrollment`), not built — see
  docs/ARCHITECTURE.md.
- ⬜ **Engagement** (6.16): pulse surveys, eNPS, anonymized by design.
  Schema present (`EnqueteEngagement`/`PulseSurveyResponse`), not built.
- ⬜ **First AI services beyond the anomaly rules already shipped**
  (7.1, 7.2): HR assistant for contract/letter generation, WhatsApp
  employee chatbot. Not built — would need an actual LLM integration
  (the codebase has no external AI provider wired in yet); the payroll
  anomaly detection in section 7.3 is already implemented as
  deterministic, explainable rules.

Exit criterion (spec): Praxis RH is a complete SIRH comparable to
category leaders, augmented with talent and AI features.

## Phase 3 — Praxis IPM (3–4 mois)

Built on top of the schema and module gate present in `src/ipm` and
`prisma/schema.prisma` (see [ARCHITECTURE.md](ARCHITECTURE.md)):

- ✅ **Adhérents & carte IPM** (8.1): activation, dependents, manual
  suspend/reactivate, and a computed (not eagerly-synced) effective card
  status that reacts instantly to a contract ending — `src/ipm/beneficiaries`.
- ✅ **Cotisations** (8.2 + interconnection 10.1): generated straight from
  Praxis RH's real payslip lines for the period, 4–15% rate, 250,000 FCFA
  assiette cap — `src/ipm/contributions`.
- ✅ **Réseau de prestataires & tiers-payant** (8.3): provider directory,
  per-act tariffs, and an eligibility check (coverage status + per-category
  remaining plafond) that answers in well under the spec's 3s target —
  `src/ipm/providers`.
- ✅ **Remboursement & anti-fraude** (8.4, 8.5, 10.3): duplicate-invoice
  detection, coverage-rate calculation capped by the annual plafond per
  category, a second "contrôle médical" validation step for sensitive acts
  (hospitalisation), and automatic RH absence justification when a case
  carries absence dates — `src/ipm/reimbursements`.
- ✅ **Paiement mobile money** (10.5): reimbursements paid through the same
  shared `PayoutsService` used for salaries and advances.
- ✅ **Sinistralité, pilotage & exports** (8.6, 10.4): dashboard overview,
  ICAMO export (representative format — no official spec was available to
  match byte-for-byte, confirm before real filing), consolidated RH+IPM
  payroll export — `src/ipm/dashboard`.
- ✅ **Frontend**: IPM manager admin screens (adhérents, cotisations,
  prestataires, dossiers, dashboard/exports) and employee self-service
  (my coverage card, submit a reimbursement with document upload, track
  dossier status) — `apps/web/src/app/app/ipm` and `apps/web/src/app/app/me/ipm`.
- ⬜ **WhatsApp bot bénéficiaire** (8.7): not built — would need a WhatsApp
  Business API integration; `NotificationsService`'s WhatsApp channel is
  currently stubbed/logged, same as the rest of the notification fallback
  chain.
- ⚠️ **Provider portal & médecin-conseil accounts**: no separate
  "prestataire" or "contrôleur médical" login exists yet — both steps are
  performed by IPM_MANAGER today (documented in
  `providers.controller.ts` and `reimbursements.service.ts`). The natural
  next increment once there's a concrete external-provider onboarding flow
  to build against.

Exit criterion (spec): an IPM runs its whole cycle on Praxis — met for the
adherent → contribution → claim → validation → payout loop; a
reimbursement case's processing time depends on how quickly a gestionnaire
acts, not on anything the system adds.

## Phase 4 — Pack Intérim + interconnexions RH↔IPM (2–3 mois)

The five RH↔IPM connectors from section 10 were already built during
Phase 3 (see docs/ROADMAP.md's Phase 3 section and
`docs/ARCHITECTURE.md`'s Phase 3 write-up) — contribution base fed by
real payroll, contract-status → coverage-status, medical justification
reconciled with absence, consolidated payroll export, and the shared
`PayoutsService` used by salary/advance/reimbursement payouts alike.
What Phase 4 adds:

- ✅ **Missions & affectations** (9.1): dual hourly rates (billing vs.
  pay), an intérimaire is an ordinary `Employee` (no parallel worker
  concept), blacklist enforcement blocks a new assignment outright —
  `src/interim/missions`.
- ✅ **Pointeuse terrain renforcée** (9.2): GPS + selfie captured at
  submission, plus a per-mission site QR token compared against what the
  intérimaire's app submits at clock-in to prove physical presence —
  `src/interim/timesheets`.
- ✅ **Extranet validation client** (9.3): a one-time link minted per
  timesheet lets the client contact approve or contest hours with **no
  Praxis login at all** — `interim/client-validation/:token`, publicly
  reachable, using the same sanctioned RLS-bypass pattern
  `AuthService.login` uses to search across tenants (see
  `docs/ARCHITECTURE.md`).
- ✅ **Incidents & blacklisting** (9.4): incident reports are a
  separate fact from the explicit blacklist decision — reporting an
  incident never blacklists anyone automatically — `src/interim/incidents`.
- ✅ **Acomptes & facturation proforma** (9.5): advances paid through the
  same shared `PayoutsService` as RH salary and IPM reimbursements;
  proforma invoices computed only from **client-approved** hours ×
  the mission's billing rate, frozen at generation time —
  `src/interim/advances`, `src/interim/billing`.
- ✅ **Frontend**: manager admin screens (missions, timesheets, incidents
  & blacklist, advances, billing) and intérimaire self-service (my
  missions, field pointage submission, advance requests) —
  `apps/web/src/app/app/interim` and `apps/web/src/app/app/me/interim`.
- ✅ **Second country onboarded into `CountryRuleSet` purely as data**
  (Côte d'Ivoire), proving the "one country at a time, by configuration"
  principle from section 2.3 — no code changed in `rules.service.ts`,
  `payroll.service.ts`, or `leave.service.ts` to add it. Finding and
  fixing this is exactly what proved the principle: both services had
  hardcoded `'SN'` instead of reading the tenant's own `countryCode`, a
  latent bug from Phase 1 that this phase's live testing surfaced (see
  `docs/ARCHITECTURE.md`).

Exit criterion (spec): a three-module client gets consolidated payroll
and mission/coverage sync — met (Phase 3's interconnections); a second
country activates by configuration alone — met and verified live
(a Côte d'Ivoire tenant's payroll and leave accrual compute against CI's
own rates, not Senegal's).
