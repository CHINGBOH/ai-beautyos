-- Row-Level Security: tenant isolation
--
-- Strategy:
--   * Each retrofitted table carries a `tenant_id uuid` column.
--   * RLS is ENABLED but not FORCED. The owning role (`beautyos`)
--     therefore bypasses RLS — the application enforces tenancy in
--     code. This keeps existing routes working unchanged.
--   * The Hermes-facing role (`beautyos_hermes`) is NOT the owner and
--     has NOBYPASSRLS, so it MUST set `app.tenant_id` at the start of
--     every transaction (the BeautyOS adapter does this on its
--     behalf via withTenant()).
--   * Policy is permissive: a session that has NOT set the GUC sees
--     nothing (defence in depth — Hermes never gets to read another
--     tenant's data by forgetting to set the variable).
--
-- Re-running this script is safe: it drops and recreates each policy.

DO $$
DECLARE
  r record;
  pol_name text;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND table_name NOT IN (
        'tenants','agent_profiles','agent_sessions','agent_messages',
        'tool_invocations','policy_decisions','audit_log','outbox'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
    pol_name := r.table_name || '_tenant_isolation';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, r.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I
         USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)
         WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      pol_name, r.table_name
    );
  END LOOP;
END$$;

-- Lock the hermes role out of RLS bypass and grant SELECT/INSERT/UPDATE/DELETE on
-- the retrofitted tables (DDL still belongs to beautyos).
ALTER ROLE beautyos_hermes NOBYPASSRLS;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND table_name NOT IN ('tenants')
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO beautyos_hermes',
      r.table_name
    );
  END LOOP;
END$$;
