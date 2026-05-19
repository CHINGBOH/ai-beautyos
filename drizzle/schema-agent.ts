/**
 * Agent-Native overlay schema (Phase-2).
 *
 * 7 new tables that persist Hermes agent activity, tool invocations, and
 * policy decisions. The existing 37 CRM tables in `./schema.ts` get a
 * `tenant_id` column via a separate migration; this file owns the new tables
 * and the `tenants` root.
 *
 * Source of truth design: docs/architecture/database-design.md
 *
 * Conventions:
 *   - All primary keys are `uuid` (DEFAULT gen_random_uuid()) except append-
 *     only logs (`agent_messages`, `audit_log`), which use `bigserial`.
 *   - All timestamps are `timestamptz` (mode: "string" to match existing
 *     schema style).
 *   - `tenant_id` is denormalized on hot-path child tables (agent_messages,
 *     tool_invocations) so we can index by tenant without a join.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  bigserial,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ─────────────────── 3.1 tenants ─────────────────── */

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`)
      .notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    plan: varchar("plan", { length: 32 }).default("trial").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("tenants_slug_uq").on(t.slug),
    index("tenants_status_idx").on(t.status),
  ]
);

/* ─────────────────── 3.2 agent_profiles ─────────────────── */

export const agentProfiles = pgTable(
  "agent_profiles",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`)
      .notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    policyId: varchar("policy_id", { length: 64 }).notNull(),
    policyVersion: varchar("policy_version", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    model: varchar("model", { length: 64 }),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("agent_profiles_tenant_policy_uq").on(t.tenantId, t.policyId),
    index("agent_profiles_tenant_idx").on(t.tenantId),
  ]
);

/* ─────────────────── 3.3 agent_sessions ─────────────────── */

export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`)
      .notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => agentProfiles.id, { onDelete: "restrict" }),
    actorKind: varchar("actor_kind", { length: 16 }).notNull(),
    actorRef: varchar("actor_ref", { length: 128 }).notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "string" }),
    lastActivityAt: timestamp("last_activity_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    contextSnapshot: jsonb("context_snapshot").default({}).notNull(),
    outcome: jsonb("outcome"),
  },
  (t) => [
    index("agent_sessions_tenant_status_activity_idx").on(
      t.tenantId,
      t.status,
      t.lastActivityAt
    ),
    index("agent_sessions_profile_idx").on(t.profileId),
    index("agent_sessions_actor_idx").on(t.actorKind, t.actorRef),
  ]
);

/* ─────────────────── 3.5 tool_invocations (declared before agent_messages
 * because agent_messages references it via FK) ─────────────────── */

export const toolInvocations = pgTable(
  "tool_invocations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`)
      .notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id").references(() => agentSessions.id, {
      onDelete: "set null",
    }),
    callerKind: varchar("caller_kind", { length: 16 }).notNull(),
    callerRef: varchar("caller_ref", { length: 128 }).notNull(),
    toolName: varchar("tool_name", { length: 64 }).notNull(),
    toolVersion: varchar("tool_version", { length: 32 }),
    params: jsonb("params").default({}).notNull(),
    dryRun: boolean("dry_run").default(false).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    latencyMs: integer("latency_ms"),
    resultSummary: jsonb("result_summary"),
    errorCode: varchar("error_code", { length: 64 }),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "string",
    }),
    requestId: varchar("request_id", { length: 64 }),
    traceId: varchar("trace_id", { length: 64 }),
  },
  (t) => [
    index("tool_invocations_tenant_started_idx").on(t.tenantId, t.startedAt),
    index("tool_invocations_tool_status_idx").on(t.toolName, t.status),
    index("tool_invocations_session_idx").on(t.sessionId, t.startedAt),
    index("tool_invocations_request_idx").on(t.requestId),
  ]
);

/* ─────────────────── 3.4 agent_messages ─────────────────── */

export const agentMessages = pgTable(
  "agent_messages",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => agentSessions.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    role: varchar("role", { length: 16 }).notNull(),
    content: text("content"),
    invocationId: uuid("invocation_id").references(() => toolInvocations.id, {
      onDelete: "set null",
    }),
    tokenUsage: jsonb("token_usage"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("agent_messages_session_created_idx").on(t.sessionId, t.createdAt),
    index("agent_messages_tenant_created_idx").on(t.tenantId, t.createdAt),
  ]
);

/* ─────────────────── 3.6 policy_decisions ─────────────────── */

export const policyDecisions = pgTable(
  "policy_decisions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`)
      .notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    invocationId: uuid("invocation_id")
      .notNull()
      .references(() => toolInvocations.id, { onDelete: "cascade" }),
    policyId: varchar("policy_id", { length: 64 }).notNull(),
    policyVersion: varchar("policy_version", { length: 32 }).notNull(),
    rulePath: varchar("rule_path", { length: 255 }).notNull(),
    decision: varchar("decision", { length: 20 }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("policy_decisions_tenant_decision_idx").on(
      t.tenantId,
      t.decision,
      t.createdAt
    ),
    index("policy_decisions_invocation_idx").on(t.invocationId),
  ]
);

/* ─────────────────── 3.7 audit_log ─────────────────── */

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "restrict",
    }),
    kind: varchar("kind", { length: 64 }).notNull(),
    actorKind: varchar("actor_kind", { length: 16 }).notNull(),
    actorRef: varchar("actor_ref", { length: 128 }),
    subjectKind: varchar("subject_kind", { length: 32 }),
    subjectRef: varchar("subject_ref", { length: 128 }),
    payload: jsonb("payload").default({}).notNull(),
    requestId: varchar("request_id", { length: 64 }),
    traceId: varchar("trace_id", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("audit_log_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("audit_log_kind_created_idx").on(t.kind, t.createdAt),
    index("audit_log_subject_idx").on(t.subjectKind, t.subjectRef),
  ]
);

/* ─────────────────── exports ─────────────────── */

export const agentNativeTables = {
  tenants,
  agentProfiles,
  agentSessions,
  agentMessages,
  toolInvocations,
  policyDecisions,
  auditLog,
};
