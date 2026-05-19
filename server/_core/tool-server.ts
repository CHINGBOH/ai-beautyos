import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { Express, Request, Response } from "express";
import { recordAudit } from "./system-registry";
import { tenantContext, tokenBucketAllow } from "./tenant-context";

// MVP Tool Server — mounted in-process under /tools/*.
// Issue #17 explicitly allows this; #29 documents splitting it into its
// own image later. The wire shape is what matters now.
//
// Each tool is:
//   - one YAML in config/tools/<name>.yaml (#25 — risk/timeout/etc)
//   - one handler in TOOL_HANDLERS below (the actual logic, MVP-stubbed)
//
// Hermes calls:
//   GET  /tools                    -> list available tools
//   GET  /tools/:name              -> tool config
//   POST /tools/:name/invoke       -> { input, dryRun?, confirmed? } -> result
//
// Hard rules enforced here (defence in depth — policies also enforce):
//   - timeout per call (config.timeoutMs)
//   - requiresConfirm + supportsDryRun + dryRun=true => return preview
//   - requiresConfirm + confirmed!=true => 412 Precondition Required
//   - every call audited via recordAudit()
//
// Multi-tenant / rate-limit / auth headers — see middleware module.

export type ToolConfig = {
  schemaVersion: string;
  name: string;
  description: string;
  risk: "low" | "medium" | "high" | "very_high";
  access: "ro" | "rw";
  timeoutMs: number;
  maxRows: number;
  rateLimitPerMin: number;
  requiresConfirm: boolean;
  supportsDryRun: boolean;
  tags?: string[];
  audit?: "full" | "summary" | "none";
};

const TOOL_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "config/tools"),
  path.resolve(__dirname, "../../config/tools"),
  path.resolve(__dirname, "../config/tools"),
];

function findToolDir(): string | null {
  for (const p of TOOL_DIR_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let TOOL_CONFIGS: Record<string, ToolConfig> = {};

function loadToolConfigs(): Record<string, ToolConfig> {
  const dir = findToolDir();
  if (!dir) {
    console.warn("[tool-server] no config/tools directory found; running with empty registry");
    return {};
  }
  const out: Record<string, ToolConfig> = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".yaml")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    try {
      const cfg = parseYaml(raw) as ToolConfig;
      if (!cfg?.name) continue;
      if (cfg.name !== file.replace(/\.yaml$/, "")) {
        console.warn(`[tool-server] ${file} name mismatch, skipping`);
        continue;
      }
      out[cfg.name] = cfg;
    } catch (e) {
      console.warn(`[tool-server] failed to parse ${file}:`, e);
    }
  }
  return out;
}

// ---- Tool handlers (MVP stubs returning shaped fake data) -----------------
// Real implementations land in follow-up issues. Each handler is async,
// receives validated input, and returns the documented output shape.

type Handler = (input: any, ctx: { tenantId: string }) => Promise<any>;

const TOOL_HANDLERS: Record<string, Handler> = {
  async search_customers(input) {
    const limit = Math.min(input?.limit ?? 20, 50);
    return {
      rows: Array.from({ length: Math.min(3, limit) }).map((_, i) => ({
        id: `cust_${i + 1}`,
        name: `客户${i + 1}`,
        channel: input?.channel ?? "xiaohongshu",
        lastContactAt: new Date().toISOString(),
      })),
      total: 3,
    };
  },
  async get_customer_profile(input) {
    if (!input?.customerId) throw new Error("customerId required");
    return {
      id: input.customerId,
      name: "Demo 客户",
      tags: ["vip", "护肤"],
      lastFiveInteractions: [],
    };
  },
  async get_business_overview(input) {
    return {
      windowDays: input?.rangeDays ?? 7,
      newCustomers: 0,
      conversions: 0,
      pendingFollowups: 0,
      staleFollowups: 0,
    };
  },
  async list_recent_conversations(input) {
    const limit = Math.min(input?.limit ?? 10, 30);
    return { rows: Array.from({ length: 0 }).slice(0, limit) };
  },
  async generate_followup_suggestion(input) {
    if (!input?.customerId) throw new Error("customerId required");
    return {
      customerId: input.customerId,
      tone: input?.tone ?? "warm_concierge",
      draft: "您好，最近还在用上次推荐的护肤组合吗？方便约个时间看看肌肤状态。",
      rationale: "MVP stub — 真正实现接入 LLM + 画像在后续 issue。",
    };
  },
};

function withTimeout<T>(promise: Promise<T>, ms: number, tool: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`tool '${tool}' timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

// ---- Express wiring -------------------------------------------------------

export function registerToolServerRoutes(app: Express) {
  TOOL_CONFIGS = loadToolConfigs();
  const names = Object.keys(TOOL_CONFIGS).sort();
  console.log(`[tool-server] loaded ${names.length} tools: ${names.join(", ") || "(none)"}`);

  // Attach tenant context to every /tools/* request. Non-strict in MVP so
  // local curl still works; switch to strict:true when bearer auth lands.
  app.use("/tools", tenantContext({ strict: false }));

  app.get("/tools", (_req: Request, res: Response) => {
    res.json({
      tools: Object.values(TOOL_CONFIGS).map((t) => ({
        name: t.name,
        description: t.description,
        risk: t.risk,
        access: t.access,
        requiresConfirm: t.requiresConfirm,
        supportsDryRun: t.supportsDryRun,
        tags: t.tags ?? [],
      })),
    });
  });

  app.get("/tools/:name", (req: Request, res: Response) => {
    const cfg = TOOL_CONFIGS[req.params.name];
    if (!cfg) return res.status(404).json({ error: "tool not found" });
    res.json(cfg);
  });

  app.post("/tools/:name/invoke", async (req: Request, res: Response) => {
    const name = req.params.name;
    const cfg = TOOL_CONFIGS[name];
    if (!cfg) return res.status(404).json({ error: "tool not found" });

    const handler = TOOL_HANDLERS[name];
    if (!handler) return res.status(501).json({ error: "tool has no handler" });

    const tenantId = req.tenantContext?.tenantId ?? "default";
    const agentId = req.tenantContext?.agentId ?? "unknown";
    const requestId = req.tenantContext?.requestId ?? `req_${Date.now()}`;
    const body = req.body ?? {};
    const input = body.input ?? {};
    const dryRun = body.dryRun === true;
    const confirmed = body.confirmed === true;

    if (!tokenBucketAllow(tenantId, name, cfg.rateLimitPerMin)) {
      recordAudit({
        ts: new Date().toISOString(),
        kind: "tool.invoke.rate_limited",
        tool: name,
        tenantId,
        agentId,
        requestId,
      });
      res.setHeader("retry-after", "60");
      return res.status(429).json({ error: "rate_limited", tool: name });
    }

    if (cfg.requiresConfirm && !confirmed && !(dryRun && cfg.supportsDryRun)) {
      recordAudit({
        ts: new Date().toISOString(),
        kind: "tool.invoke.blocked",
        tool: name,
        tenantId,
        agentId,
        requestId,
        reason: "confirmation_required",
      });
      return res.status(412).json({
        error: "confirmation_required",
        message: `tool '${name}' requires { confirmed: true } or { dryRun: true } when supportsDryRun`,
      });
    }

    const t0 = Date.now();
    try {
      const result = await withTimeout(handler(input, { tenantId }), cfg.timeoutMs, name);
      const dt = Date.now() - t0;
      recordAudit({
        ts: new Date().toISOString(),
        kind: dryRun ? "tool.invoke.dryrun" : "tool.invoke.ok",
        tool: name,
        tenantId,
        agentId,
        requestId,
        durationMs: dt,
      });
      return res.json({
        tool: name,
        dryRun,
        durationMs: dt,
        result: dryRun ? { preview: result } : result,
      });
    } catch (e: any) {
      const dt = Date.now() - t0;
      recordAudit({
        ts: new Date().toISOString(),
        kind: "tool.invoke.error",
        tool: name,
        tenantId,
        agentId,
        requestId,
        durationMs: dt,
        error: e?.message ?? String(e),
      });
      return res.status(500).json({ error: e?.message ?? "tool invocation failed" });
    }
  });
}
