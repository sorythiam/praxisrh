# Roadmap — phases 2 to 4

Phase 1 (this repository) delivers the multi-tenant core and a complete
Praxis RH module. This is what remains, per the source spec (section
13), in the order it should be built — each phase builds only on what
Phase 1 already established, so none of it requires revisiting the
tenant isolation, auth, or module-activation mechanisms.

## Phase 2 — Praxis RH avancé (2–3 mois)

Extends the RH module already in this repo with:

- **Talents & évolution de carrière** (section 6.12): skills mapping,
  internal mobility marketplace, individual development plans,
  succession planning for key roles.
- **Performance & OKR** (6.13): individual/team goals, continuous
  feedback, calibrated review cycles.
- **Recrutement / ATS** (6.14): job postings, scored applications,
  candidate → employee conversion re-using `EmployeesService.create`.
- **Formation** (6.15): catalogue, recommendations derived from the
  skills-gap data from Talents.
- **Engagement** (6.16): pulse surveys, eNPS, anonymized by design.
- **First AI services** (7.1, 7.2, 7.3 beyond the anomaly rules already
  shipped): HR assistant for contract/letter generation, WhatsApp
  employee chatbot, refining payroll anomaly detection.

Exit criterion (spec): Praxis RH is a complete SIRH comparable to
category leaders, augmented with talent and AI features.

## Phase 3 — Praxis IPM (3–4 mois)

Builds the business logic on top of the schema and module gate already
present in `src/ipm` and `prisma/schema.prisma` (see
[ARCHITECTURE.md](ARCHITECTURE.md)):

- Adhérents & carte IPM QR (8.1), cotisations (8.2, 4–15% with the
  250,000 FCFA assiette cap already modeled),
- réseau de prestataires & tiers-payant with <3s eligibility checks (8.3),
- remboursement hors réseau with OCR + multi-level validation (8.4),
- contrôle médical & anti-fraude (8.5),
- sinistralité, pilotage & exports ICAMO (8.6),
- WhatsApp bot bénéficiaire (8.7).

Exit criterion (spec): an IPM runs its whole cycle on Praxis; a
reimbursement case is processed in under 5 business days.

## Phase 4 — Pack Intérim + interconnexions RH↔IPM (2–3 mois)

- Missions & affectations with dual hourly rates (9.1), reinforced field
  timeclock with GPS/selfie/QR (9.2), client validation extranet (9.3),
  incidents/blacklisting (9.4), advances/VDP/proforma (9.5) — schema
  already in `InterimMission`/`InterimAssignment`/`InterimTimesheet`/
  `InterimAdvance`.
- The five RH↔IPM connectors from section 10 (contribution base fed by
  real payroll, contract-status → coverage-status, medical justification
  reconciled with absence, consolidated payroll export, shared mobile
  money payout — the last of which, `PayoutsService`, already exists and
  is shared by salary/advance payouts today).
- Second country onboarded into `CountryRuleSet` purely as data, proving
  the "one country at a time, by configuration" principle from section 2.3.

Exit criterion (spec): a three-module client gets consolidated payroll
and mission/coverage sync; a second country activates by configuration
alone.
