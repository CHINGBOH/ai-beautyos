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
import { loadTenantConfig, clearTenantConfigCache, renderSystemPrompt } from "./tenant-config";

interface AuditEntry {
  ts: string;
  kind: string;
  tool?: string;
  outcome: "ok" | "error";
  traceId?: string;
  requestId?: string;
  tenantId?: string;
  agentId?: string;
  durationMs?: number;
  errorReason?: string;
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
}
