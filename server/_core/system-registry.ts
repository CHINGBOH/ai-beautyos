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

// Tiny in-memory ring buffer for recent tool calls. A proper persistent
// audit log is its own issue (#18 mentions tenant audit, planned). For now
// /system/audit/recent at least gives Hermes a real surface to query.
const AUDIT_CAP = 200;
const audit: AuditEntry[] = [];

export function recordAudit(entry: Omit<AuditEntry, "ts">): void {
  audit.push({ ts: new Date().toISOString(), ...entry });
  if (audit.length > AUDIT_CAP) audit.splice(0, audit.length - AUDIT_CAP);
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
}
