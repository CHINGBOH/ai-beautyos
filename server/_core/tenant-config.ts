/**
 * Tenant config loader (Issue #26).
 *
 * - Loads `config/tenants/_default.yaml` and merges with the per-tenant
 *   YAML if it exists.
 * - Validates the merged result against TenantConfigSchema (zod).
 * - Caches results in-process; call `clearTenantConfigCache()` to drop.
 * - Records each first-time load to audit_log (kind="tenant_config.loaded").
 *
 * - Renders `.md.tmpl` prompt templates with a tiny mustache-subset
 *   engine. Missing variables throw at render time unless the
 *   reference uses `| default: "..."`.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { logger } from "./logger";
import { persistAuditLog } from "./agent-persistence";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In dev __dirname = .../server/_core; in prod (esbuild bundled) the
// dist runs from /app, so prefer process.cwd() for `config/` lookup.
const CONFIG_ROOT = resolve(process.cwd(), "config");
const TENANT_DIR = resolve(CONFIG_ROOT, "tenants");
const PROMPT_DIR = resolve(CONFIG_ROOT, "prompts");

/* ─────────────────── schema ─────────────────── */

const TierRule = z.object({
  min_lifetime_value_cny: z.number().nonnegative().optional(),
  min_repurchase_count: z.number().int().nonnegative().optional(),
  inactive_days_threshold: z.number().int().positive().optional(),
});

const Cadence = z.object({
  initial_after_days: z.number().int().nonnegative(),
  nurture_interval_days: z.number().int().nonnegative(),
  inactive_followup_days: z.number().int().nonnegative(),
});

export const TenantConfigSchema = z.object({
  schemaVersion: z.string(),

  brand: z.object({
    display_name: z.string().min(1),
    short_name: z.string().min(1),
    industry: z.string(),
    language: z.string().default("zh-CN"),
    region: z.string().default("CN"),
    timezone: z.string().default("Asia/Shanghai"),
  }),

  customer_tiers: z.object({
    vip: TierRule,
    regular: TierRule,
    lead: TierRule,
    cold: TierRule,
  }),

  followup_cadence: z.object({
    vip: Cadence,
    regular: Cadence,
    lead: Cadence,
    cold: Cadence,
  }),

  content_style: z.object({
    tone: z.enum([
      "friendly_professional",
      "warm_concierge",
      "direct_and_brief",
      "educational",
    ]),
    formality: z.enum(["low", "medium", "high"]).default("medium"),
    emoji_usage: z.enum(["none", "minimal", "moderate"]).default("minimal"),
    max_paragraph_chars: z.number().int().positive().default(240),
    signoff: z.string(),
  }),

  recommendation_weights: z.record(z.string(), z.number().nonnegative()),

  forbidden_words: z.array(z.string()).default([]),

  compliance: z.object({
    require_medical_disclaimer: z.boolean().default(true),
    medical_disclaimer: z.string(),
    require_price_disclaimer: z.boolean().default(true),
    price_disclaimer: z.string(),
    forbid_before_after_photos_without_consent: z.boolean().default(true),
  }),

  hermes_limits: z.object({
    max_tool_calls_per_turn: z.number().int().positive(),
    max_turns_per_session: z.number().int().positive(),
    daily_token_budget: z.number().int().positive(),
    daily_tool_call_budget: z.number().int().positive(),
  }),

  prompts: z.object({
    system_default: z.string(),
    system_by_profile: z.record(z.string(), z.string()).default({}),
  }),

  projects: z
    .object({
      promoted: z.array(z.string()).default([]),
      off_menu: z.array(z.string()).default([]),
    })
    .default({ promoted: [], off_menu: [] }),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;

/* ─────────────────── loader ─────────────────── */

const cache = new Map<string, TenantConfig>();

function readYamlIfExists(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  return parseYaml(raw) as Record<string, unknown>;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge<T extends Record<string, unknown>>(base: T, overlay: Partial<T>): T {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export function loadTenantConfig(tenantId: string): TenantConfig {
  const cached = cache.get(tenantId);
  if (cached) return cached;

  const defaultPath = resolve(TENANT_DIR, "_default.yaml");
  const tenantPath = resolve(TENANT_DIR, `${tenantId}.yaml`);

  const defaults = readYamlIfExists(defaultPath);
  if (!defaults) {
    throw new Error(`tenant-config: missing default file at ${defaultPath}`);
  }
  const overlay = readYamlIfExists(tenantPath) ?? {};
  const merged = deepMerge(defaults as Record<string, unknown>, overlay);

  const parsed = TenantConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const errs = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`tenant-config: invalid for ${tenantId}: ${errs}`);
  }

  cache.set(tenantId, parsed.data);
  logger.info(
    `[tenant-config] loaded tenant=${tenantId} brand="${parsed.data.brand.display_name}" overlay=${existsSync(tenantPath)}`,
  );

  // Audit asynchronously — never block load.
  persistAuditLog({
    kind: "tenant_config.loaded",
    tenantId,
    actorKind: "system",
    subjectKind: "tenant_config",
    subjectRef: tenantId,
    payload: {
      brand: parsed.data.brand.display_name,
      hasOverlay: existsSync(tenantPath),
      schemaVersion: parsed.data.schemaVersion,
    },
  });

  return parsed.data;
}

export function clearTenantConfigCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

/* ─────────────────── template engine ─────────────────── */

interface RenderContext {
  tenant: TenantConfig;
  profile?: Record<string, unknown>;
  session?: Record<string, unknown>;
  ctx?: Record<string, unknown>;
}

function getPath(root: unknown, path: string): unknown {
  if (path === "." || path === "") return root;
  const parts = path.split(".");
  let cur: any = root;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Render a `.md.tmpl` template.
 *
 * Supports:
 *   {{var.path}}                         required lookup
 *   {{var.path | default: "fallback"}}   optional with fallback
 *   {{# var.list }} item: {{.}} {{/ var.list }}   array/truthy section
 *   {{! comment }}                       stripped
 *
 * Throws if a non-default reference is missing.
 */
export function renderTemplate(template: string, vars: RenderContext): string {
  let out = template;

  // Strip comments
  out = out.replace(/\{\{!\s*[\s\S]*?\}\}/g, "");

  // Sections: {{# path}}...{{/ path}}
  out = out.replace(/\{\{#\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g, (_m, path: string, body: string) => {
    const val = getPath(vars, path.trim());
    if (val == null || val === false || val === "" || (Array.isArray(val) && val.length === 0)) {
      return "";
    }
    if (Array.isArray(val)) {
      return val
        .map((item) => body.replace(/\{\{\s*\.\s*\}\}/g, String(item)))
        .join("");
    }
    return body;
  });

  // Simple substitutions
  out = out.replace(/\{\{\s*([\w.]+)(\s*\|\s*default:\s*"([^"]*)")?\s*\}\}/g, (_m, path: string, _opt, def?: string) => {
    const val = getPath(vars, path.trim());
    if (val == null || val === "") {
      if (def !== undefined) return def;
      throw new Error(`renderTemplate: missing value for "${path}" and no default provided`);
    }
    return String(val);
  });

  return out;
}

const templateCache = new Map<string, string>();

export function loadPromptTemplate(category: "system", name: string): string {
  const key = `${category}/${name}`;
  const cached = templateCache.get(key);
  if (cached) return cached;
  const path = resolve(PROMPT_DIR, category, `${name}.md.tmpl`);
  if (!existsSync(path)) {
    throw new Error(`prompt template not found: ${path}`);
  }
  const raw = readFileSync(path, "utf8");
  templateCache.set(key, raw);
  return raw;
}

/**
 * Resolve and render the system prompt for a given tenant + profile.
 * Profile name is informational; the tenant config picks the actual
 * template via `prompts.system_by_profile[profile] || prompts.system_default`.
 */
export function renderSystemPrompt(opts: {
  tenantId: string;
  profile?: string;
  session?: Record<string, unknown>;
  ctx?: Record<string, unknown>;
}): string {
  const tenant = loadTenantConfig(opts.tenantId);
  const templateName =
    (opts.profile && tenant.prompts.system_by_profile[opts.profile]) ||
    tenant.prompts.system_default;
  const tpl = loadPromptTemplate("system", templateName);
  return renderTemplate(tpl, {
    tenant,
    profile: opts.profile ? { name: opts.profile } : undefined,
    session: opts.session,
    ctx: opts.ctx,
  });
}
