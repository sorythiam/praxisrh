-- Row-Level Security backstop for tenant isolation.
--
-- This is a DEFENSE-IN-DEPTH layer, not the primary enforcement mechanism.
-- The primary mechanism is the Prisma Client Extension in
-- src/core/prisma/tenant-scoping.extension.ts, which refuses to run any
-- query against a tenant-scoped model without a tenant id in context and
-- injects it automatically. RLS below protects against the case where
-- that extension is ever bypassed (a raw query, a future contributor
-- forgetting to use the scoped client, a compromised credential).
--
-- The API sets `app.tenant_id` for the duration of each request's
-- transaction (see src/core/tenancy/tenant-transaction.interceptor.ts).
-- The Postgres role used by the app must NOT be a superuser and must NOT
-- have BYPASSRLS, otherwise these policies are silently ignored.
--
-- Apply after every `prisma migrate deploy`:
--   psql "$DATABASE_URL" -f prisma/rls.sql

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'establishments', 'module_activations', 'subscriptions', 'users',
    'persons', 'payment_transactions', 'notifications', 'audit_logs',
    'employees', 'contracts', 'shifts', 'clock_events', 'leave_balances',
    'leave_requests', 'payroll_reports', 'payslip_lines', 'payslips',
    'payout_batches', 'payout_items', 'ipm_beneficiaries',
    'ipm_dependents', 'ipm_contributions', 'ipm_providers', 'ipm_tariffs',
    'ipm_annual_caps', 'ipm_reimbursement_cases',
    'interim_missions', 'interim_assignments', 'interim_timesheets',
    'interim_advances', 'competences', 'employee_competences',
    'postes_internes', 'poste_interne_requirements',
    'poste_interne_applications', 'development_plans', 'succession_plans',
    'succession_candidates', 'objectives', 'key_results',
    'feedback_entries', 'review_cycles', 'performance_reviews',
    'job_postings', 'candidates', 'job_applications', 'actions_formation',
    'formation_enrollments', 'enquetes_engagement', 'pulse_survey_responses'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    -- `app.bypass_rls` is an explicit, narrow escape hatch for the small,
    -- fixed set of call sites that must legitimately run before a tenant
    -- is known (ModuleGuard checking module activation ahead of the
    -- request transaction, login resolving which tenant an email/phone
    -- belongs to, and the PRAXIS_ADMIN back-office which is cross-tenant
    -- by design). Every place that sets it is grep-able
    -- (`app.bypass_rls`) and goes through core/prisma/rls-bypass.ts —
    -- there is no ambient way to acquire it.
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId"::text = current_setting(''app.tenant_id'', true) OR current_setting(''app.bypass_rls'', true) = ''on'') WITH CHECK ("tenantId"::text = current_setting(''app.tenant_id'', true) OR current_setting(''app.bypass_rls'', true) = ''on'')',
      t
    );
  END LOOP;
END $$;
