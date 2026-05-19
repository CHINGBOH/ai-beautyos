#!/usr/bin/env node
/**
 * Hermes adapter end-to-end harness.
 *
 * Simulates the request flow a real beautyos-hermes runtime would make,
 * exercising the full BeautyOS-side contract documented in
 * docs/architecture/hermes-adapter.md:
 *
 *   1. GET  /system/manifest      — version handshake
 *   2. GET  /system/tools         — tool catalogue
 *   3. GET  /system/permissions   — allow/forbid policy
 *   4. POST /tools/<name>/invoke  — execute a permitted tool
 *   5. GET  /system/audit/recent  — confirm the call was audited
 *
 * It does NOT need the real beautyos-hermes container; that repo can be
 * built later. As long as this harness passes, the adapter contract is
 * intact and a real Hermes runtime that follows the spec will work.
 *
 * Usage:
 *   node scripts/hermes-harness.mjs                          # default localhost:3000
 *   BEAUTYOS_BASE=http://web:3000 node scripts/hermes-harness.mjs
 */

const BASE = process.env.BEAUTYOS_BASE || "http://localhost:3000";
const TENANT = process.env.BEAUTYOS_TENANT_ID || "00000000-0000-0000-0000-000000000001";
const AGENT_ID = process.env.HERMES_AGENT_ID || "hermes-harness";
const TOOL = process.env.HERMES_TEST_TOOL || "get_business_overview";

const HEADERS = {
  "content-type": "application/json",
  "x-tenant-id": TENANT,
  "x-agent-id": AGENT_ID,
};

let failed = 0;
function check(label, cond, detail = "") {
  const tag = cond ? "✓" : "✗";
  console.log(`  ${tag} ${label}${detail ? "  (" + detail + ")" : ""}`);
  if (!cond) failed++;
}

async function step(name, fn) {
  console.log(`\n[${name}]`);
  try {
    await fn();
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}`);
    failed++;
  }
}

async function get(path) {
  const r = await fetch(BASE + path, { headers: HEADERS });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}

async function post(path, payload) {
  const reqId = `harness-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { ...HEADERS, "x-request-id": reqId },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body, requestId: reqId };
}

console.log(`Hermes harness → ${BASE}`);
console.log(`  tenant=${TENANT}  agent=${AGENT_ID}  tool=${TOOL}`);

let toolCatalogue = [];
let manifestVersion = null;

await step("1) version handshake", async () => {
  const { status, body } = await get("/system/manifest");
  check("HTTP 200", status === 200, `status=${status}`);
  check("has manifest_version", !!(body.manifest_version || body.meta?.version), body.manifest_version || body.meta?.version);
  check("has system.name", body.system?.name, body.system?.name);
  manifestVersion = body.manifest_version;
});

await step("2) tool catalogue", async () => {
  const { status, body } = await get("/system/tools");
  check("HTTP 200", status === 200);
  const tools = body.tools ?? body;
  check("is array", Array.isArray(tools), `${Array.isArray(tools) ? tools.length : "?"} tools`);
  if (Array.isArray(tools)) toolCatalogue = tools;
  const hasTest = toolCatalogue.some((t) => (t.name ?? t.id) === TOOL);
  check(`includes ${TOOL}`, hasTest);
});

await step("3) permissions policy", async () => {
  const { status, body } = await get("/system/permissions");
  check("HTTP 200", status === 200);
  check("has allow or forbid lists", body.allow !== undefined || body.forbid !== undefined || body.policies !== undefined || body.permissions !== undefined);
});

let invocationRequestId = null;
await step(`4) invoke ${TOOL}`, async () => {
  const { status, body, requestId } = await post(`/tools/${TOOL}/invoke`, { dryRun: false });
  invocationRequestId = requestId;
  check("HTTP 200/202", status === 200 || status === 202, `status=${status}`);
  check("response is object", body && typeof body === "object");
  if (body && typeof body === "object") {
    const summary = JSON.stringify(body).slice(0, 120);
    console.log(`    payload preview: ${summary}${summary.length === 120 ? "…" : ""}`);
  }
});

await step("5) audit trail", async () => {
  // worker writes are fire-and-forget; give them a moment.
  await new Promise((r) => setTimeout(r, 600));
  const { status, body } = await get(`/system/audit/recent?limit=20`);
  check("HTTP 200", status === 200);
  const events = body.entries ?? body.events ?? body.audit ?? (Array.isArray(body) ? body : null);
  check("is array", Array.isArray(events));
  if (Array.isArray(events)) {
    const matched = events.find(
      (e) =>
        e.requestId === invocationRequestId ||
        e.request_id === invocationRequestId ||
        ((e.tool === TOOL || e.target === TOOL) &&
          (e.agentId === AGENT_ID || e.agent_id === AGENT_ID || e.actor === AGENT_ID))
    );
    check("our invocation is audited", !!matched, matched ? "found" : `no match for req=${invocationRequestId}`);
    if (matched) {
      console.log(`    audit entry: ${JSON.stringify(matched).slice(0, 200)}`);
    }
  }
});

console.log(`\n${failed === 0 ? "✅ all checks passed" : `❌ ${failed} check(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
