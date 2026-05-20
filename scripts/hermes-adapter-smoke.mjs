#!/usr/bin/env node
// Reference Hermes ↔ BeautyOS adapter smoke test.
//
// Runs the exact bootstrap + invoke sequence specified in
// docs/architecture/hermes-adapter.md against a live stack. Use this as
// both an integration test from the host and a copy-paste reference for
// the real beautyos-hermes implementation.
//
// Usage (from host, against compose stack):
//   BEAUTYOS_BASE=http://localhost:3000 \
//   TOOL_BASE=http://localhost:5001 \
//   HERMES_PROFILE_FILE=config/hermes-app-profile.yaml \
//   node scripts/hermes-adapter-smoke.mjs
//
// Or, when tool-server is published to a host port for testing:
//   TOOL_BASE=http://localhost:5001 node scripts/hermes-adapter-smoke.mjs
//
// Exit codes:
//   0  full bootstrap + invoke succeeded
//   1  bootstrap failure (manifest / tools / permissions)
//   2  manifest version incompatible
//   3  invoke failure

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE = process.env.BEAUTYOS_BASE || "http://localhost:3000";
const TOOL_BASE = process.env.TOOL_BASE || BASE;
const TENANT_ID = process.env.BEAUTYOS_TENANT_ID || "00000000-0000-0000-0000-000000000001";
let AGENT_ID = process.env.BEAUTYOS_AGENT_ID || "";

function log(stage, detail) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), stage, ...detail }));
}

function fail(code, reason, extra = {}) {
  log("fatal", { reason, ...extra });
  process.exit(code);
}

function reqHeaders() {
  const rid = `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    "x-tenant-id": TENANT_ID,
    "x-agent-id": AGENT_ID,
    "x-request-id": rid,
    "x-trace-id": rid,
  };
}

async function getJson(url, headers = {}) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} on ${url}`);
  return r.json();
}

function readProfile() {
  const configured = process.env.HERMES_PROFILE_FILE;
  const defaultAppProfile = resolve(__dirname, "../config/hermes-app-profile.yaml");
  const fallbackProfile = resolve(__dirname, "../config/hermes-profile.yaml");
  const path = configured
    ? resolve(configured)
    : existsSync(defaultAppProfile)
      ? defaultAppProfile
      : fallbackProfile;
  const raw = readFileSync(path, "utf-8");
  return { path, profile: parseYaml(raw) };
}

// SemVer range check — handles ">=1.0.0 <2.0.0" subset.
function isVersionCompatible(version, range) {
  const [maj] = version.split(".").map(Number);
  const m = range.match(/>=\s*(\d+)\.\d+\.\d+\s*<\s*(\d+)\.\d+\.\d+/);
  if (!m) return true; // unparseable range → don't block
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  return maj >= lo && maj < hi;
}

async function main() {
  const { path: profilePath, profile } = readProfile();
  AGENT_ID = AGENT_ID || profile?.identity?.agentId || "hermes-app-business-v1";
  const wantRange = profile?.compatible?.beautyosManifest;
  log("boot", { base: BASE, toolBase: TOOL_BASE, tenantId: TENANT_ID, agentId: AGENT_ID });
  log("profile.loaded", { profilePath, policyFile: profile?.policy?.file, wantRange });

  // Step 1: manifest + version compat
  let manifest;
  try {
    manifest = await getJson(BASE + (profile.beautyos?.endpoints?.manifest || "/system/manifest"));
  } catch (e) {
    fail(1, "manifest fetch failed", { err: String(e) });
  }
  const version = manifest?.meta?.version;
  log("manifest.ok", { version });
  if (wantRange && !isVersionCompatible(version, wantRange)) {
    fail(2, "manifest version incompatible", { version, wantRange });
  }

  // Step 2: tool catalogue (system view)
  const sysTools = await getJson(BASE + (profile.beautyos?.endpoints?.tools || "/system/tools"));
  const sysToolNames = (sysTools?.tools || []).map((t) => t.name);
  log("system.tools", {
    count: Array.isArray(sysTools?.tools) ? sysTools.tools.length : 0,
    source: sysTools?.source,
  });
  for (const required of ["query_knowledge_base", "create_content_draft", "run_whitelist_script"]) {
    if (!sysToolNames.includes(required)) {
      fail(1, "required tool missing from system catalogue", { required, source: sysTools?.source });
    }
  }

  // Step 3: permissions
  const perms = await getJson(BASE + (profile.beautyos?.endpoints?.permissions || "/system/permissions"));
  log("system.permissions", { keys: Object.keys(perms || {}) });

  // Step 4: tool-server live view (this is where invoke happens in Phase-3)
  const liveTools = await getJson(TOOL_BASE + "/tools");
  log("toolserver.tools", {
    count: Array.isArray(liveTools?.tools) ? liveTools.tools.length : 0,
    names: (liveTools?.tools || []).map((t) => t.name),
  });

  // Step 5: invoke low-risk read-only tools with full identity headers
  const target = "get_business_overview";
  if (!(liveTools?.tools || []).some((t) => t.name === target)) {
    fail(3, "expected tool missing from live catalogue", { target });
  }
  const headers = { ...reqHeaders(), "content-type": "application/json" };
  log("invoke.start", { tool: target, requestId: headers["x-request-id"] });

  const r = await fetch(`${TOOL_BASE}/tools/${target}/invoke`, {
    method: "POST",
    headers,
    body: JSON.stringify({ input: { rangeDays: 7 } }),
  });
  if (!r.ok) {
    const body = await r.text();
    fail(3, "invoke failed", { status: r.status, body: body.slice(0, 200) });
  }
  const out = await r.json();
  log("invoke.ok", { tool: out.tool, durationMs: out.durationMs, requestId: headers["x-request-id"] });

  const knowledgeTarget = "query_knowledge_base";
  if ((liveTools?.tools || []).some((t) => t.name === knowledgeTarget)) {
    const kr = await fetch(`${TOOL_BASE}/tools/${knowledgeTarget}/invoke`, {
      method: "POST",
      headers: { ...reqHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ input: { keyword: "部署", limit: 3 } }),
    });
    if (!kr.ok) {
      const body = await kr.text();
      fail(3, "knowledge tool invoke failed", { status: kr.status, body: body.slice(0, 200) });
    }
    const kout = await kr.json();
    log("invoke.knowledge.ok", {
      tool: kout.tool,
      rows: Array.isArray(kout?.result?.rows) ? kout.result.rows.length : 0,
    });
  }

  // Step 6: assert behavioural rules from doc
  // - confirm-required tool must 412 without `confirmed:true`
  const confirmTarget = (liveTools?.tools || []).some((t) => t.name === "create_content_draft")
    ? "create_content_draft"
    : "generate_followup_suggestion";
  if ((liveTools?.tools || []).some((t) => t.name === confirmTarget)) {
    const cr = await fetch(`${TOOL_BASE}/tools/${confirmTarget}/invoke`, {
      method: "POST",
      headers: { ...reqHeaders(), "content-type": "application/json" },
      body: JSON.stringify({
        input: confirmTarget === "create_content_draft"
          ? { type: "project", project: "热玛吉" }
          : { customerId: "cust_demo" },
      }),
    });
    if (cr.status !== 412) {
      fail(3, "confirm-required tool did not return 412", { got: cr.status });
    }
    log("invoke.confirm_blocked.ok", { tool: confirmTarget, status: 412 });

    if (confirmTarget === "create_content_draft") {
      const dr = await fetch(`${TOOL_BASE}/tools/${confirmTarget}/invoke`, {
        method: "POST",
        headers: { ...reqHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ dryRun: true, input: { type: "project", project: "热玛吉" } }),
      });
      if (!dr.ok) {
        const body = await dr.text();
        fail(3, "confirm-required dry-run failed", { status: dr.status, body: body.slice(0, 200) });
      }
      const dout = await dr.json();
      log("invoke.confirm_dryrun.ok", { tool: dout.tool, dryRun: dout.dryRun });
    }
  }

  const forbiddenForApp = "run_whitelist_script";
  if ((liveTools?.tools || []).some((t) => t.name === forbiddenForApp) && AGENT_ID.startsWith("hermes-app-")) {
    const fr = await fetch(`${TOOL_BASE}/tools/${forbiddenForApp}/invoke`, {
      method: "POST",
      headers: { ...reqHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ dryRun: true, input: { name: "ops-preflight.sh" } }),
    });
    if (fr.status !== 403) {
      fail(3, "app agent was not blocked from ops-only tool", { tool: forbiddenForApp, got: fr.status });
    }
    log("invoke.policy_denied.ok", { tool: forbiddenForApp, status: 403, agentId: AGENT_ID });
  }

  log("done", { ok: true });
}

main().catch((e) => fail(1, "unexpected", { err: e.stack || String(e) }));
