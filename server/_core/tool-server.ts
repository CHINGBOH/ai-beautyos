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

type HandlerContext = {
  tenantId: string;
  agentId: string;
  dryRun: boolean;
  confirmed: boolean;
};

type Handler = (input: any, ctx: HandlerContext) => Promise<any>;

const TOOL_HANDLERS: Record<string, Handler> = {
  async search_customers(input) {
    const { searchCustomers } = await import("../services/customers.service");
    return searchCustomers({
      limit: input?.limit,
      channel: input?.channel,
      tier: input?.tier,
    });
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
    const { getBusinessOverview } = await import("../services/analytics.service");
    return getBusinessOverview(input?.rangeDays ?? 7);
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
    const { generateFollowupSuggestion } = await import("../services/followup.service");
    return generateFollowupSuggestion({
      customerId: Number(input.customerId),
      tone: input?.tone,
    });
  },

  async generate_daily_report() {
    const { generateDailyReport } = await import("../services/daily-report.service");
    return generateDailyReport();
  },

  async generate_silent_customer_report(input) {
    const { generateSilentCustomerReport } = await import("../services/silent-customer.service");
    return generateSilentCustomerReport(input?.coldDaysThreshold ?? 30);
  },

  async generate_content_topics() {
    const { generateContentTopics } = await import("../services/content-strategy.service");
    return generateContentTopics();
  },

  async generate_todo_draft() {
    const { generateTodoDraft } = await import("../services/todo-draft.service");
    return generateTodoDraft();
  },

  async query_knowledge_base(input) {
    const { queryKnowledgeBaseTool } = await import("../services/hermes-app-tools.service");
    return queryKnowledgeBaseTool(input ?? {});
  },

  async create_content_draft(input, ctx) {
    const { createContentDraftTool } = await import("../services/hermes-app-tools.service");
    return createContentDraftTool(input ?? {}, ctx);
  },

  async update_content_draft(input, ctx) {
    const { updateContentDraftTool } = await import("../services/hermes-app-tools.service");
    return updateContentDraftTool(input ?? {}, ctx);
  },

  async schedule_xiaohongshu_post(input, ctx) {
    const { scheduleXiaohongshuPostTool } = await import("../services/hermes-app-tools.service");
    return scheduleXiaohongshuPostTool(input ?? {}, ctx);
  },

  async update_customer_followup(input, ctx) {
    const { updateCustomerFollowupTool } = await import("../services/hermes-app-tools.service");
    return updateCustomerFollowupTool(input ?? {}, ctx);
  },

  async create_marketing_task(input, ctx) {
    const { createMarketingTaskTool } = await import("../services/hermes-app-tools.service");
    return createMarketingTaskTool(input ?? {}, ctx);
  },

  async create_knowledge_entry(input, ctx) {
    const { createKnowledgeEntryTool } = await import("../services/hermes-app-tools.service");
    return createKnowledgeEntryTool(input ?? {}, ctx);
  },

  async read_beautyos_log(input) {
    const { readLog } = await import("../services/maintenance.service");
    return readLog(input?.lines ?? 50, input?.filter);
  },

  async check_beautyos_status() {
    const { checkStatus } = await import("../services/maintenance.service");
    return checkStatus();
  },

  async read_beautyos_file(input) {
    if (!input?.path) throw new Error("path required");
    const { readRepoFile } = await import("../services/maintenance.service");
    return readRepoFile(String(input.path));
  },

  async get_beautyos_git_status() {
    const { getGitStatus } = await import("../services/maintenance.service");
    return getGitStatus();
  },

  async get_beautyos_git_diff(input) {
    const { getGitDiff } = await import("../services/maintenance.service");
    return getGitDiff(input?.pathspec);
  },

  async run_beautyos_tests(input) {
    const { runTests } = await import("../services/maintenance.service");
    return runTests(input?.suite);
  },

  async run_whitelist_script(input, ctx) {
    if (!input?.name) throw new Error("name required");
    if (ctx.dryRun) {
      const { previewWhitelistScript } = await import("../services/maintenance.service");
      return previewWhitelistScript(String(input.name));
    }
    const { runWhitelistScript } = await import("../services/maintenance.service");
    return runWhitelistScript(String(input.name));
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
      const result = await withTimeout(
        handler(input, { tenantId, agentId, dryRun, confirmed }),
        cfg.timeoutMs,
        name
      );
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
