/**
 * Agent-native persistence helpers.
 *
 * Thin write-only layer over the 8 overlay tables (tenants, agent_profiles,
 * agent_sessions, agent_messages, tool_invocations, policy_decisions,
 * audit_log, outbox). All writes are fire-and-forget by design — if the DB
 * is unavailable, the hot path (chat, tool invoke) must still work; we log
 * a warning and continue.
 *
 * Design source: docs/architecture/database-design.md
 */

import { getDb } from "../db";
import {
  tenants,
  agentProfiles,
  agentSessions,
  agentMessages,
  toolInvocations,
  policyDecisions,
  auditLog,
} from "../../drizzle/schema-agent";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_POLICY_ID = "sales-assistant";

/** Best-effort DB write. Logs but does not throw. */
function fireAndForget<T>(label: string, p: Promise<T>): void {
  p.catch((err) => {
    logger.warn(`[agent-persistence] ${label} failed: ${(err as Error).message}`);
  });
}

/* ─────────────────── profiles ─────────────────── */

const profileCache = new Map<string, string>(); // tenantId+policyId -> profileId

export async function ensureDefaultProfile(
  tenantId: string = DEFAULT_TENANT_ID,
  policyId: string = DEFAULT_POLICY_ID
): Promise<string | null> {
  const key = `${tenantId}:${policyId}`;
  const cached = profileCache.get(key);
  if (cached) return cached;

  const db = await getDb();
  if (!db) return null;

  try {
    const existing = await db
      .select({ id: agentProfiles.id })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.tenantId, tenantId), eq(agentProfiles.policyId, policyId)))
      .limit(1);

    if (existing.length > 0) {
      profileCache.set(key, existing[0].id);
      return existing[0].id;
    }

    const inserted = await db
      .insert(agentProfiles)
      .values({
        tenantId,
        policyId,
        policyVersion: "0.1.0",
        displayName: "Sales Assistant",
      })
      .returning({ id: agentProfiles.id });

    if (inserted[0]) {
      profileCache.set(key, inserted[0].id);
      return inserted[0].id;
    }
    return null;
  } catch (err) {
    logger.warn(
      `[agent-persistence] ensureDefaultProfile failed: ${(err as Error).message}`
    );
    return null;
  }
}

/* ─────────────────── agent sessions ─────────────────── */

export async function persistAgentSession(opts: {
  tenantId?: string;
  actorKind: string;
  actorRef: string;
  contextSnapshot?: Record<string, unknown>;
}): Promise<string | null> {
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  const db = await getDb();
  if (!db) return null;

  const profileId = await ensureDefaultProfile(tenantId);
  if (!profileId) return null;

  try {
    const rows = await db
      .insert(agentSessions)
      .values({
        tenantId,
        profileId,
        actorKind: opts.actorKind,
        actorRef: opts.actorRef,
        contextSnapshot: opts.contextSnapshot ?? {},
      })
      .returning({ id: agentSessions.id });
    return rows[0]?.id ?? null;
  } catch (err) {
    logger.warn(
      `[agent-persistence] persistAgentSession failed: ${(err as Error).message}`
    );
    return null;
  }
}

export function persistAgentMessage(opts: {
  sessionId: string;
  tenantId?: string;
  role: "user" | "assistant" | "system" | "tool";
  content?: string | null;
  invocationId?: string | null;
  tokenUsage?: Record<string, unknown> | null;
}): void {
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  fireAndForget(
    "persistAgentMessage",
    (async () => {
      const db = await getDb();
      if (!db) return;
      await db.insert(agentMessages).values({
        sessionId: opts.sessionId,
        tenantId,
        role: opts.role,
        content: opts.content ?? null,
        invocationId: opts.invocationId ?? null,
        tokenUsage: opts.tokenUsage ?? null,
      });
    })()
  );
}

/* ─────────────────── tool invocations ─────────────────── */

export async function persistInvocationStart(opts: {
  tenantId?: string;
  sessionId?: string | null;
  callerKind: string;
  callerRef: string;
  toolName: string;
  toolVersion?: string;
  params: Record<string, unknown>;
  dryRun?: boolean;
  requestId?: string;
  traceId?: string;
}): Promise<string | null> {
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .insert(toolInvocations)
      .values({
        tenantId,
        sessionId: opts.sessionId ?? null,
        callerKind: opts.callerKind,
        callerRef: opts.callerRef,
        toolName: opts.toolName,
        toolVersion: opts.toolVersion ?? null,
        params: opts.params,
        dryRun: opts.dryRun ?? false,
        status: "accepted",
        requestId: opts.requestId ?? null,
        traceId: opts.traceId ?? null,
      })
      .returning({ id: toolInvocations.id });
    return rows[0]?.id ?? null;
  } catch (err) {
    logger.warn(
      `[agent-persistence] persistInvocationStart failed: ${(err as Error).message}`
    );
    return null;
  }
}

export function persistInvocationFinish(opts: {
  invocationId: string;
  status: "ok" | "error" | "blocked" | "rate_limited" | "timeout" | "dry_run";
  latencyMs: number;
  resultSummary?: unknown;
  errorCode?: string;
}): void {
  fireAndForget(
    "persistInvocationFinish",
    (async () => {
      const db = await getDb();
      if (!db) return;
      await db
        .update(toolInvocations)
        .set({
          status: opts.status,
          latencyMs: opts.latencyMs,
          resultSummary:
            opts.resultSummary !== undefined
              ? (opts.resultSummary as Record<string, unknown>)
              : null,
          errorCode: opts.errorCode ?? null,
          finishedAt: new Date().toISOString(),
        })
        .where(eq(toolInvocations.id, opts.invocationId));
    })()
  );
}

export function persistPolicyDecision(opts: {
  tenantId?: string;
  invocationId: string;
  policyId: string;
  policyVersion?: string;
  rulePath: string;
  decision: "allow" | "deny" | "require_confirm" | "require_dry_run";
  reason?: string;
}): void {
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  fireAndForget(
    "persistPolicyDecision",
    (async () => {
      const db = await getDb();
      if (!db) return;
      await db.insert(policyDecisions).values({
        tenantId,
        invocationId: opts.invocationId,
        policyId: opts.policyId,
        policyVersion: opts.policyVersion ?? "0.1.0",
        rulePath: opts.rulePath,
        decision: opts.decision,
        reason: opts.reason ?? null,
      });
    })()
  );
}

/* ─────────────────── audit log ─────────────────── */

export function persistAuditLog(opts: {
  tenantId?: string | null;
  kind: string;
  actorKind: string;
  actorRef?: string;
  subjectKind?: string;
  subjectRef?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
  traceId?: string;
}): void {
  fireAndForget(
    "persistAuditLog",
    (async () => {
      const db = await getDb();
      if (!db) return;
      await db.insert(auditLog).values({
        tenantId: opts.tenantId ?? null,
        kind: opts.kind,
        actorKind: opts.actorKind,
        actorRef: opts.actorRef ?? null,
        subjectKind: opts.subjectKind ?? null,
        subjectRef: opts.subjectRef ?? null,
        payload: opts.payload ?? {},
        requestId: opts.requestId ?? null,
        traceId: opts.traceId ?? null,
      });
    })()
  );
}

/* ─────────────────── tenant bootstrap ─────────────────── */

let tenantEnsured = false;

export async function ensureDefaultTenant(): Promise<void> {
  if (tenantEnsured) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(tenants)
      .values({
        id: DEFAULT_TENANT_ID,
        slug: "default",
        displayName: "Default Tenant",
        status: "active",
        plan: "enterprise",
      })
      .onConflictDoNothing();
    tenantEnsured = true;
  } catch (err) {
    logger.warn(
      `[agent-persistence] ensureDefaultTenant failed: ${(err as Error).message}`
    );
  }
}
