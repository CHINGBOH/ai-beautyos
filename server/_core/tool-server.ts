import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { Express, Request, Response } from "express";
import { recordAudit } from "./system-registry";
import {
  persistInvocationStart,
  persistInvocationFinish,
  persistPolicyDecision,
} from "./agent-persistence";
import { tenantContext, tokenBucketAllow } from "./tenant-context";
import { getLeadById, getAllConversations, getMessagesByConversationId } from "../db";
import { callQwen } from "../qwen";

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
  path.resolve(import.meta.dirname, "../../config/tools"),
  path.resolve(import.meta.dirname, "../config/tools"),
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

type Handler = (input: any, ctx: { tenantId: string }) => Promise<any>;

const TOOL_HANDLERS: Record<string, Handler> = {
  async search_customers(input) {
    const limit = Math.min(input?.limit ?? 20, 50);
    const channel = input?.channel as string | undefined;
    const tier = input?.tier as string | undefined;

    const { getDb } = await import("../db");
    const { leads } = await import("../../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return { rows: [], total: 0 };

    const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
    let filtered = allLeads as typeof allLeads;
    if (channel) filtered = filtered.filter(l => l.source?.includes(channel));
    if (tier) filtered = filtered.filter(l => l.customerTier === tier);

    const rows = filtered.slice(0, limit).map(l => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      channel: l.source,
      tier: l.customerTier,
      psychologyType: l.psychologyType,
      status: l.status,
      lastContactAt: l.updatedAt,
    }));

    return { rows, total: filtered.length };
  },

  async get_customer_profile(input) {
    if (!input?.customerId) throw new Error("customerId required");
    const id = Number(input.customerId);
    const lead = await getLeadById(id);
    if (!lead) throw new Error(`Customer ${id} not found`);

    let lastFiveInteractions: Array<{ role: string; content: string; at: string }> = [];
    if (lead.conversationId) {
      const msgs = await getMessagesByConversationId(lead.conversationId);
      lastFiveInteractions = msgs
        .slice(-5)
        .map(m => ({ role: m.role, content: m.content, at: m.createdAt }));
    }

    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      wechat: lead.wechat,
      source: lead.source,
      tier: lead.customerTier,
      psychologyType: lead.psychologyType,
      interestedServices: (() => {
        try { return JSON.parse(lead.interestedServices || "[]"); } catch { return []; }
      })(),
      budget: lead.budget,
      status: lead.status,
      followUpDate: lead.followUpDate,
      lastFiveInteractions,
    };
  },

  async get_business_overview(input) {
    const rangeDays = input?.rangeDays ?? 7;
    const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
    const nowISO = new Date().toISOString();

    const { getDb } = await import("../db");
    const { leads } = await import("../../drizzle/schema");
    const db = await getDb();
    if (!db) return { windowDays: rangeDays, newCustomers: 0, conversions: 0, pendingFollowups: 0, staleFollowups: 0, totalLeads: 0 };

    const allLeads = await db.select().from(leads);
    const newCustomers = allLeads.filter(l => l.createdAt >= since).length;
    const pendingFollowups = allLeads.filter(l =>
      l.followUpDate && l.followUpDate >= nowISO && l.status !== "converted"
    ).length;
    const staleFollowups = allLeads.filter(l =>
      l.followUpDate && l.followUpDate < nowISO && l.status !== "converted"
    ).length;
    const conversions = allLeads.filter(l =>
      l.convertedAt && l.convertedAt >= since
    ).length;

    return {
      windowDays: rangeDays,
      newCustomers,
      conversions,
      pendingFollowups,
      staleFollowups,
      totalLeads: allLeads.length,
    };
  },

  async list_recent_conversations(input) {
    const limit = Math.min(input?.limit ?? 10, 30);
    const convs = await getAllConversations();
    const rows = convs.slice(0, limit).map((c: any) => ({
      id: c.id,
      sessionId: c.sessionId,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return { rows, total: convs.length };
  },

  async generate_followup_suggestion(input) {
    if (!input?.customerId) throw new Error("customerId required");
    const id = Number(input.customerId);
    const lead = await getLeadById(id);
    if (!lead) throw new Error(`Customer ${id} not found`);

    const tone = input?.tone ?? "warm_concierge";
    const toneMap: Record<string, string> = {
      warm_concierge: "温暖、亲切、像老朋友一样",
      professional: "专业、权威、简洁",
      caring: "关怀、体贴、情感化",
    };
    const toneDesc = toneMap[tone] || toneMap.warm_concierge;

    let services: string[] = [];
    try { services = JSON.parse(lead.interestedServices || "[]"); } catch {}

    const prompt = `你是一名医美机构的销售顾问，请根据以下客户信息生成一条${toneDesc}风格的跟进话术（微信消息），50-80字，不要有任何额外说明。

客户姓名：${lead.name}
感兴趣项目：${services.join("、") || "未知"}
预算：${lead.budget || "未填写"}
客户心理类型：${lead.psychologyType || "未知"}
状态：${lead.status}`;

    let draft: string;
    try {
      draft = await callQwen([{ role: "user", content: prompt }]);
    } catch {
      draft = `您好${lead.name}，最近肌肤状态怎么样？我们最近有${services[0] || "护肤"}方面的新方案，方便的话可以约个时间来详细了解一下～`;
    }

    return {
      customerId: id,
      customerName: lead.name,
      tone,
      draft: draft.trim(),
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
        kind: "tool.invoke.rate_limited",
        tool: name,
        tenantId,
        agentId,
        requestId,
      });
      const blockedId = await persistInvocationStart({
        tenantId,
        callerKind: "hermes",
        callerRef: agentId,
        toolName: name,
        params: input,
        dryRun,
        requestId,
      });
      if (blockedId) {
        persistInvocationFinish({
          invocationId: blockedId,
          status: "rate_limited",
          latencyMs: 0,
          errorCode: "rate_limited",
        });
      }
      res.setHeader("retry-after", "60");
      return res.status(429).json({ error: "rate_limited", tool: name });
    }

    if (cfg.requiresConfirm && !confirmed && !(dryRun && cfg.supportsDryRun)) {
      recordAudit({
        kind: "tool.invoke.blocked",
        tool: name,
        tenantId,
        agentId,
        requestId,
        reason: "confirmation_required",
      });
      const blockedId = await persistInvocationStart({
        tenantId,
        callerKind: "hermes",
        callerRef: agentId,
        toolName: name,
        params: input,
        dryRun,
        requestId,
      });
      if (blockedId) {
        persistInvocationFinish({
          invocationId: blockedId,
          status: "blocked",
          latencyMs: 0,
          errorCode: "confirmation_required",
        });
        persistPolicyDecision({
          tenantId,
          invocationId: blockedId,
          policyId: "sales-assistant",
          rulePath: `tools.${name}.requires_confirm`,
          decision: "require_confirm",
          reason: "confirmation_required",
        });
      }
      return res.status(412).json({
        error: "confirmation_required",
        message: `tool '${name}' requires { confirmed: true } or { dryRun: true } when supportsDryRun`,
      });
    }

    const invocationId = await persistInvocationStart({
      tenantId,
      callerKind: "hermes",
      callerRef: agentId,
      toolName: name,
      params: input,
      dryRun,
      requestId,
    });

    const t0 = Date.now();
    try {
      const result = await withTimeout(handler(input, { tenantId }), cfg.timeoutMs, name);
      const dt = Date.now() - t0;
      recordAudit({
        kind: dryRun ? "tool.invoke.dryrun" : "tool.invoke.ok",
        tool: name,
        tenantId,
        agentId,
        requestId,
        durationMs: dt,
      });
      if (invocationId) {
        persistInvocationFinish({
          invocationId,
          status: dryRun ? "dry_run" : "ok",
          latencyMs: dt,
          resultSummary:
            dryRun
              ? { preview: true }
              : typeof result === "object" && result !== null
              ? (result as Record<string, unknown>)
              : { value: result },
        });
      }
      return res.json({
        tool: name,
        dryRun,
        durationMs: dt,
        result: dryRun ? { preview: result } : result,
      });
    } catch (e: any) {
      const dt = Date.now() - t0;
      recordAudit({
        kind: "tool.invoke.error",
        tool: name,
        tenantId,
        agentId,
        requestId,
        durationMs: dt,
        error: e?.message ?? String(e),
      });
      if (invocationId) {
        persistInvocationFinish({
          invocationId,
          status: "error",
          latencyMs: dt,
          errorCode: e?.code ?? "tool_error",
          resultSummary: { error: e?.message ?? String(e) },
        });
      }
      return res.status(500).json({ error: e?.message ?? "tool invocation failed" });
    }
  });
}
