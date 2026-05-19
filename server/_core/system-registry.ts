/**
 * System Registry — /system/* endpoints.
 *
 * Hermes (and any other agent) reads these routes to learn what BeautyOS
 * can do, what's healthy, what permissions exist, and what just happened.
 *
 * Design rules:
 *  - Read-only. No mutations from here.
 *  - No secrets. No tenant data. Counts and shapes only.
 *  - Cheap. These endpoints must be safe to poll every few seconds.
 *  - Sourced from version-controlled docs/system-manifest.yaml so the
 *    static system map and the runtime registry can never silently
 *    disagree. Live data (health, deployment commit) is overlaid.
 */

import fs from "node:fs";
import path from "node:path";
import type { Express, Request, Response } from "express";
import YAML from "yaml";

interface Manifest {
  meta?: Record<string, unknown>;
  system?: Record<string, unknown>;
  modules?: Array<Record<string, unknown>>;
  routes?: Record<string, unknown>;
  services?: Array<Record<string, unknown>>;
  tools?: Array<Record<string, unknown>>;
  data_models?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  deployment?: Record<string, unknown>;
  hermes?: Record<string, unknown>;
}

let cached: Manifest | null = null;
let cachedAt = 0;
const TTL_MS = 30_000;

function locateManifest(): string {
  // The runner stage Dockerfile copies the repo's docs/ separately, but
  // when running from a built bundle we look in two places: alongside the
  // dist (production), or relative to the source root (dev / pnpm dev).
  const candidates = [
    path.resolve(import.meta.dirname, "../../docs/system-manifest.yaml"),
    path.resolve(import.meta.dirname, "../docs/system-manifest.yaml"),
    path.resolve(process.cwd(), "docs/system-manifest.yaml"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[candidates.length - 1];
}

function loadManifest(): Manifest {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;

  const file = locateManifest();
  try {
    const raw = fs.readFileSync(file, "utf8");
    cached = YAML.parse(raw) as Manifest;
    cachedAt = now;
    return cached;
  } catch (err) {
    console.warn(`[system-registry] manifest unavailable at ${file}: ${(err as Error).message}`);
    return {};
  }
}

import { persistAuditLog } from "./agent-persistence";
import { loadTenantConfig, clearTenantConfigCache, renderSystemPrompt, validatePatch, applyPatchToOverlay } from "./tenant-config";
import { getDb } from "../db";
import { tenantConfigDrafts } from "../../drizzle/schema-agent";
import { eq, and, desc, sql as drizzleSql } from "drizzle-orm";

interface AuditEntry {
  ts: string;
  kind: string;
  tool?: string;
  outcome?: "ok" | "error";
  traceId?: string;
  requestId?: string;
  tenantId?: string;
  agentId?: string;
  durationMs?: number;
  errorReason?: string;
  reason?: string;
  error?: string;
}

// In-memory ring is now a hot cache for /system/audit/recent.
// The durable record lives in audit_log (see persistAuditLog).
const AUDIT_CAP = 200;
const audit: AuditEntry[] = [];

export function recordAudit(entry: Omit<AuditEntry, "ts">): void {
  const full: AuditEntry = { ts: new Date().toISOString(), ...entry };
  audit.push(full);
  if (audit.length > AUDIT_CAP) audit.splice(0, audit.length - AUDIT_CAP);

  // Fire-and-forget DB write — failures do not break the hot path.
  persistAuditLog({
    tenantId: entry.tenantId ?? null,
    kind: entry.kind,
    actorKind: entry.agentId ? "hermes" : "system",
    actorRef: entry.agentId,
    subjectKind: entry.tool ? "tool" : undefined,
    subjectRef: entry.tool,
    payload: {
      outcome: entry.outcome,
      durationMs: entry.durationMs,
      errorReason: entry.errorReason,
    },
    requestId: entry.requestId,
    traceId: entry.traceId,
  });
}

export function registerSystemRegistryRoutes(
  app: Express,
  startedAt: Date,
): void {
  // Full manifest — preferred Hermes entry point.
  app.get("/system/manifest", (_req: Request, res: Response) => {
    const m = loadManifest();
    res.status(200).json({
      ...m,
      meta: {
        ...(m.meta || {}),
        served_at: new Date().toISOString(),
        served_by: "system-registry-runtime",
      },
    });
  });

  app.get("/system/modules", (_req, res) => {
    res.status(200).json({ modules: loadManifest().modules ?? [] });
  });

  app.get("/system/tools", (_req, res) => {
    // Until #25's tool-config layer lands, return manifest tool entries.
    // Tool Server (#17) will register its live tool descriptors here too.
    res.status(200).json({ tools: loadManifest().tools ?? [] });
  });

  app.get("/system/permissions", (_req, res) => {
    res.status(200).json({ permissions: loadManifest().permissions ?? {} });
  });

  app.get("/system/schema-map", (_req, res) => {
    res.status(200).json({ data_models: loadManifest().data_models ?? {} });
  });

  app.get("/system/deployment", (_req, res) => {
    const m = loadManifest();
    res.status(200).json({
      deployment: m.deployment ?? {},
      runtime: {
        commit: process.env.GIT_COMMIT || "unknown",
        startedAt: startedAt.toISOString(),
        uptimeSec: Math.round(process.uptime()),
        nodeVersion: process.version,
      },
    });
  });

  // Liveness-style summary; does NOT touch the DB. A future /system/health
  // with DB ping lives behind an explicit query flag (?deep=1) so probes
  // remain cheap.
  app.get("/system/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "ai-beautyos",
      commit: process.env.GIT_COMMIT || "unknown",
      startedAt: startedAt.toISOString(),
      uptimeSec: Math.round(process.uptime()),
    });
  });

  app.get("/system/audit/recent", (req, res) => {
    const limit = Math.max(
      1,
      Math.min(AUDIT_CAP, Number(req.query.limit ?? 50)),
    );
    const slice = audit.slice(-limit).reverse();
    res.status(200).json({ count: slice.length, entries: slice });
  });

  // Tenant config inspection (#26). Returns the merged + validated config
  // for the tenant in x-tenant-id (default tenant if missing).
  app.get("/system/tenant-config", (req: Request, res: Response) => {
    const tenantId =
      (req.headers["x-tenant-id"] as string | undefined)?.trim() ||
      (req.query.tenantId as string | undefined) ||
      "00000000-0000-0000-0000-000000000001";
    try {
      const cfg = loadTenantConfig(tenantId);
      res.status(200).json({ tenantId, config: cfg });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Reload a tenant's config from disk (force re-read + re-validate).
  // No auth gate yet — controlled by network boundary (#21 follow-up).
  app.post("/system/tenant-config/reload", (req: Request, res: Response) => {
    const tenantId =
      (req.headers["x-tenant-id"] as string | undefined)?.trim() ||
      (req.body?.tenantId as string | undefined) ||
      undefined;
    clearTenantConfigCache(tenantId);
    try {
      const cfg = tenantId ? loadTenantConfig(tenantId) : null;
      res.status(200).json({
        reloaded: tenantId ?? "ALL",
        ok: true,
        brand: cfg?.brand.display_name,
      });
    } catch (e) {
      res.status(400).json({ ok: false, error: (e as Error).message });
    }
  });

  // Render the system prompt for a tenant + profile, for inspection.
  app.get("/system/tenant-config/prompt", (req: Request, res: Response) => {
    const tenantId =
      (req.headers["x-tenant-id"] as string | undefined)?.trim() ||
      (req.query.tenantId as string | undefined) ||
      "00000000-0000-0000-0000-000000000001";
    const profile = (req.query.profile as string | undefined) || "sales_assistant";
    try {
      const rendered = renderSystemPrompt({ tenantId, profile });
      res.status(200).json({ tenantId, profile, prompt: rendered });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // ──────────────── tenant_config_drafts (#26 acceptance #3) ────────────────
  // Hermes proposes a config change; humans approve/reject.
  // The actual YAML write-back is deferred — approval here records the
  // intent + flips status; the operator applies the patch manually until
  // we ship the safe YAML-patcher.

  const ALLOWED_RISK = new Set(["low", "medium", "high", "very_high"]);

  // bigserial id → JSON-safe string (JSON cannot serialize BigInt).
  const serializeDraft = (row: any) =>
    row ? { ...row, id: typeof row.id === "bigint" ? row.id.toString() : row.id } : row;

  // POST /system/tenant-config/drafts — agent proposes a change
  app.post("/system/tenant-config/drafts", async (req: Request, res: Response) => {
    const tenantId =
      (req.headers["x-tenant-id"] as string | undefined)?.trim() ||
      (req.body?.tenantId as string | undefined) ||
      "00000000-0000-0000-0000-000000000001";
    const proposedBy = String(req.body?.proposedBy || "").trim();
    const reason = String(req.body?.reason || "").trim();
    const patch = req.body?.patch;
    const riskLevel = String(req.body?.riskLevel || "low").trim();
    const proposerRef = req.body?.proposerRef ? String(req.body.proposerRef).trim() : null;

    if (!proposedBy) return res.status(400).json({ error: "proposedBy required" });
    if (!reason) return res.status(400).json({ error: "reason required" });
    if (!patch || typeof patch !== "object") return res.status(400).json({ error: "patch must be a JSON object" });
    if (!ALLOWED_RISK.has(riskLevel)) return res.status(400).json({ error: `riskLevel must be one of ${[...ALLOWED_RISK].join(",")}` });

    // Pre-validate so an invalid low-risk patch can't slip through auto-approve.
    const v = validatePatch(tenantId, patch as Record<string, unknown>);
    if (!v.ok) {
      return res.status(422).json({
        error: "patch fails schema validation; refusing to record draft",
        issues: v.errors,
      });
    }

    const autoApprove =
      riskLevel === "low" && process.env.BEAUTYOS_AUTO_APPROVE_LOW_RISK === "1";

    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "database unavailable" });

      let appliedPath: string | null = null;
      if (autoApprove) {
        try {
          const r = applyPatchToOverlay(tenantId, patch as Record<string, unknown>);
          appliedPath = r.path;
        } catch (e) {
          return res.status(500).json({ error: `overlay write failed: ${(e as Error).message}` });
        }
      }

      const [row] = await db
        .insert(tenantConfigDrafts)
        .values({
          tenantId,
          proposedBy,
          proposerRef,
          reason,
          patch,
          riskLevel,
          status: autoApprove ? "approved" : "pending",
          reviewedBy: autoApprove ? "system:auto-approve" : null,
          reviewerRef: autoApprove ? "BEAUTYOS_AUTO_APPROVE_LOW_RISK=1" : null,
          reviewNote: autoApprove ? "auto-approved (risk_level=low)" : null,
          appliedAt: autoApprove ? drizzleSql`now()` : null,
        })
        .returning();

      await persistAuditLog({
        tenantId,
        kind: autoApprove
          ? "tenant_config.draft.auto_approved"
          : "tenant_config.draft.proposed",
        actorKind: autoApprove ? "system" : "agent",
        actorRef: autoApprove ? "auto-approve" : proposedBy,
        subjectKind: "tenant_config_draft",
        subjectRef: String(row.id),
        payload: {
          reason,
          riskLevel,
          patch,
          proposedBy,
          ...(autoApprove ? { appliedPath } : {}),
        },
      });

      res.status(201).json({
        ok: true,
        draft: serializeDraft(row),
        autoApproved: autoApprove,
        ...(autoApprove ? { appliedPath } : {}),
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /system/tenant-config/drafts/validate — dry-run a patch
  // Returns the merged config (without persisting) or the Zod issues.
  // Hermes should call this before /drafts to avoid posting bad patches.
  app.post("/system/tenant-config/drafts/validate", (req: Request, res: Response) => {
    const tenantId =
      (req.headers["x-tenant-id"] as string | undefined)?.trim() ||
      (req.body?.tenantId as string | undefined) ||
      "00000000-0000-0000-0000-000000000001";
    const patch = req.body?.patch;
    if (!patch || typeof patch !== "object") {
      return res.status(400).json({ error: "patch must be a JSON object" });
    }
    const result = validatePatch(tenantId, patch);
    if (!result.ok) return res.status(422).json({ ok: false, issues: result.errors });
    return res.status(200).json({ ok: true, mergedBrand: result.merged.brand.display_name });
  });

  // GET /system/tenant-config/drafts — list (default: pending only)
  app.get("/system/tenant-config/drafts", async (req: Request, res: Response) => {
    const tenantId =
      (req.headers["x-tenant-id"] as string | undefined)?.trim() ||
      (req.query.tenantId as string | undefined);
    const status = (req.query.status as string | undefined) || "pending";
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "database unavailable" });
      const conditions = [eq(tenantConfigDrafts.status, status)];
      if (tenantId) conditions.push(eq(tenantConfigDrafts.tenantId, tenantId));
      const rows = await db
        .select()
        .from(tenantConfigDrafts)
        .where(and(...conditions))
        .orderBy(desc(tenantConfigDrafts.createdAt))
        .limit(limit);
      res.status(200).json({ count: rows.length, drafts: rows.map(serializeDraft) });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /system/tenant-config/drafts/:id/approve — human approves
  app.post("/system/tenant-config/drafts/:id/approve", async (req: Request, res: Response) => {
    const draftId = req.params.id;
    const reviewedBy = String(req.body?.reviewedBy || "").trim();
    const reviewerRef = req.body?.reviewerRef ? String(req.body.reviewerRef).trim() : null;
    const reviewNote = req.body?.reviewNote ? String(req.body.reviewNote).trim() : null;
    const applyToFile = req.body?.applyToFile !== false; // default true
    if (!reviewedBy) return res.status(400).json({ error: "reviewedBy required" });

    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "database unavailable" });
      const [draft] = await db
        .select()
        .from(tenantConfigDrafts)
        .where(eq(tenantConfigDrafts.id, BigInt(draftId)));
      if (!draft) return res.status(404).json({ error: "draft not found" });
      if (draft.status !== "pending")
        return res.status(409).json({ error: `draft already ${draft.status}` });

      // Refuse approval if the merged result wouldn't pass the schema.
      const v = validatePatch(draft.tenantId, draft.patch as Record<string, unknown>);
      if (!v.ok) {
        return res.status(422).json({
          error: "patch fails schema validation; refusing to approve",
          issues: v.errors,
        });
      }

      // Write overlay YAML (default behavior). Caller can opt out with
      // applyToFile:false if they want to copy by hand.
      let appliedPath: string | null = null;
      if (applyToFile) {
        try {
          const r = applyPatchToOverlay(draft.tenantId, draft.patch as Record<string, unknown>);
          appliedPath = r.path;
        } catch (e) {
          return res.status(500).json({ error: `overlay write failed: ${(e as Error).message}` });
        }
      }

      const [updated] = await db
        .update(tenantConfigDrafts)
        .set({
          status: "approved",
          reviewedBy,
          reviewerRef,
          reviewNote,
          appliedAt: applyToFile ? drizzleSql`now()` : null,
          updatedAt: drizzleSql`now()`,
        })
        .where(eq(tenantConfigDrafts.id, BigInt(draftId)))
        .returning();

      await persistAuditLog({
        tenantId: draft.tenantId,
        kind: "tenant_config.draft.approved",
        actorKind: "human",
        actorRef: reviewedBy,
        subjectKind: "tenant_config_draft",
        subjectRef: draftId,
        payload: {
          reviewNote,
          patch: draft.patch,
          proposedBy: draft.proposedBy,
          appliedToFile: applyToFile,
          appliedPath,
        },
      });

      res.status(200).json({
        ok: true,
        draft: serializeDraft(updated),
        appliedToFile: applyToFile,
        appliedPath,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // POST /system/tenant-config/drafts/:id/reject — human rejects
  app.post("/system/tenant-config/drafts/:id/reject", async (req: Request, res: Response) => {
    const draftId = req.params.id;
    const reviewedBy = String(req.body?.reviewedBy || "").trim();
    const reviewerRef = req.body?.reviewerRef ? String(req.body.reviewerRef).trim() : null;
    const reviewNote = req.body?.reviewNote ? String(req.body.reviewNote).trim() : null;
    if (!reviewedBy) return res.status(400).json({ error: "reviewedBy required" });
    if (!reviewNote) return res.status(400).json({ error: "reviewNote required for rejection" });

    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "database unavailable" });
      const [draft] = await db
        .select()
        .from(tenantConfigDrafts)
        .where(eq(tenantConfigDrafts.id, BigInt(draftId)));
      if (!draft) return res.status(404).json({ error: "draft not found" });
      if (draft.status !== "pending")
        return res.status(409).json({ error: `draft already ${draft.status}` });

      const [updated] = await db
        .update(tenantConfigDrafts)
        .set({
          status: "rejected",
          reviewedBy,
          reviewerRef,
          reviewNote,
          updatedAt: drizzleSql`now()`,
        })
        .where(eq(tenantConfigDrafts.id, BigInt(draftId)))
        .returning();

      await persistAuditLog({
        tenantId: draft.tenantId,
        kind: "tenant_config.draft.rejected",
        actorKind: "human",
        actorRef: reviewedBy,
        subjectKind: "tenant_config_draft",
        subjectRef: draftId,
        payload: { reviewNote, patch: draft.patch, proposedBy: draft.proposedBy },
      });

      res.status(200).json({ ok: true, draft: serializeDraft(updated) });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });
}
