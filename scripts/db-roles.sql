-- AI BeautyOS — Database Role Provisioning
--
-- Creates a restricted role `beautyos_hermes` for the Hermes agent adapter.
-- Principle: Hermes never writes business tables directly. It can write only
-- to the agent-native overlay (audit_log, agent_*, tool_invocations,
-- policy_decisions). Reads on business tables go through the Tool Server,
-- which uses the application role `beautyos`.
--
-- Apply with:
--   docker compose exec -T postgres psql -U postgres -d beautyos \
--     -f /scripts/db-roles.sql
-- or (if connecting as the beautyos owner):
--   psql -U beautyos -d beautyos -f scripts/db-roles.sql
--
-- The password is intentionally a placeholder. Replace before running in
-- any non-dev environment; pass via env var `HERMES_DB_PASSWORD` and use
-- envsubst.

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'beautyos_hermes') THEN
    -- Note: replace 'change-me' before running in production.
    EXECUTE format('CREATE ROLE beautyos_hermes WITH LOGIN PASSWORD %L', 'change-me');
  END IF;
END
$$;

-- 1. Read-only on ALL existing tables (current state snapshot).
GRANT CONNECT ON DATABASE beautyos TO beautyos_hermes;
GRANT USAGE ON SCHEMA public TO beautyos_hermes;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO beautyos_hermes;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO beautyos_hermes;

-- 2. Insert-only on append-only audit / agent tables.
--    UPDATE is allowed on tool_invocations because we set status/latency on
--    finish; everywhere else inserts only (facts never mutate).
GRANT INSERT ON
  audit_log,
  agent_sessions,
  agent_messages,
  tool_invocations,
  policy_decisions,
  outbox
TO beautyos_hermes;

GRANT UPDATE ON tool_invocations TO beautyos_hermes;
GRANT UPDATE (status, attempts, last_error, sent_at) ON outbox TO beautyos_hermes;
GRANT UPDATE (last_activity_at, status, closed_at, outcome) ON agent_sessions TO beautyos_hermes;

-- Sequence access for the bigserial PKs.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO beautyos_hermes;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO beautyos_hermes;

-- 3. Explicitly DENY write on business tables (defence in depth).
--    PG grants are additive, so this is a no-op given step 1+2, but kept
--    as documentation of intent.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
  customers,
  leads,
  conversations,
  messages,
  appointments,
  orders,
  cases,
  case_customers,
  case_photos,
  case_treatments,
  expert_reviews,
  knowledge_base,
  users,
  tenants
FROM beautyos_hermes;

-- 4. View granted privileges for verification.
SELECT
  grantee,
  table_schema,
  table_name,
  string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
FROM information_schema.role_table_grants
WHERE grantee = 'beautyos_hermes'
GROUP BY grantee, table_schema, table_name
ORDER BY table_name;
