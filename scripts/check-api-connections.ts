/**
 * API 连接监测脚本：请求 REST 与 tRPC 探针，检查是否可达、状态是否正常。
 * 运行前请先启动服务：npm run dev
 * 使用：npm run check:api  或  BASE_URL=http://localhost:3000 tsx scripts/check-api-connections.ts
 * 生成报告：REPORT_FILE=docs/api-monitor-report.md npm run check:api
 */

import { writeFileSync } from "fs";
import { join } from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

type Result = "ok" | "auth_required" | "fail";

interface CheckItem {
  name: string;
  result: Result;
  status?: number;
  ms?: number;
  note?: string;
}

async function fetchWithTiming(
  url: string,
  options: RequestInit = {}
): Promise<{ res: Response; ms: number }> {
  const start = Date.now();
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const ms = Date.now() - start;
  return { res, ms };
}

async function checkRest(items: CheckItem[]): Promise<void> {
  console.log("\n--- REST ---\n");

  // GET /api/rest/customers
  try {
    const { res, ms } = await fetchWithTiming(`${BASE_URL}/api/rest/customers`);
    const ok = res.ok && res.status === 200;
    const body = ok ? await res.json() : null;
    const valid = Array.isArray(body);
    const result: Result = ok && valid ? "ok" : "fail";
    const note = !ok ? `HTTP ${res.status}` : !valid ? "body not array" : undefined;
    items.push({
      name: "GET /api/rest/customers",
      result,
      status: res.status,
      ms,
      note,
    });
    console.log(`${result === "ok" ? "✅" : "❌"} GET /api/rest/customers  ${res.status}  ${ms}ms  ${note ?? ""}`);
  } catch (e) {
    items.push({
      name: "GET /api/rest/customers",
      result: "fail",
      note: e instanceof Error ? e.message : String(e),
    });
    console.log(`❌ GET /api/rest/customers  fail  ${e instanceof Error ? e.message : String(e)}`);
  }

  // GET /api/rest/customers/1
  try {
    const { res, ms } = await fetchWithTiming(`${BASE_URL}/api/rest/customers/1`);
    const ok = res.status === 200 || res.status === 404;
    const result: Result = ok ? "ok" : "fail";
    const note = ok ? undefined : `HTTP ${res.status}`;
    items.push({
      name: "GET /api/rest/customers/1",
      result,
      status: res.status,
      ms,
      note,
    });
    console.log(`${result === "ok" ? "✅" : "❌"} GET /api/rest/customers/1  ${res.status}  ${ms}ms  ${note ?? ""}`);
  } catch (e) {
    items.push({
      name: "GET /api/rest/customers/1",
      result: "fail",
      note: e instanceof Error ? e.message : String(e),
    });
    console.log(`❌ GET /api/rest/customers/1  fail  ${e instanceof Error ? e.message : String(e)}`);
  }

  // POST /api/rest/cron/birthday-holiday
  try {
    const { res, ms } = await fetchWithTiming(`${BASE_URL}/api/rest/cron/birthday-holiday`, {
      method: "POST",
      body: "{}",
    });
    const ok = res.ok && res.status === 200;
    let valid = true;
    if (ok) {
      const body = await res.json();
      valid = body && body.ok === true;
    }
    const result: Result = ok && valid ? "ok" : "fail";
    const note = !ok ? `HTTP ${res.status}` : !valid ? "body.ok !== true" : undefined;
    items.push({
      name: "POST /api/rest/cron/birthday-holiday",
      result,
      status: res.status,
      ms,
      note,
    });
    console.log(`${result === "ok" ? "✅" : "❌"} POST /api/rest/cron/birthday-holiday  ${res.status}  ${ms}ms  ${note ?? ""}`);
  } catch (e) {
    items.push({
      name: "POST /api/rest/cron/birthday-holiday",
      result: "fail",
      note: e instanceof Error ? e.message : String(e),
    });
    console.log(`❌ POST /api/rest/cron/birthday-holiday  fail  ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** 可无登录或最小入参的 tRPC 探针：path、入参、是否为 mutation（tRPC 约定：query 用 GET，mutation 用 POST） */
const TRPC_PROBES: { path: string; input: unknown; mutation: boolean }[] = [
  { path: "system.health", input: { timestamp: Date.now() }, mutation: false },
  { path: "auth.me", input: {}, mutation: false },
  { path: "customers.list", input: {}, mutation: false },
  { path: "knowledge.getModules", input: {}, mutation: false },
  { path: "analytics.getOverview", input: {}, mutation: false },
  { path: "website.getEffectShowcaseImage", input: {}, mutation: false },
  { path: "wework.getConfig", input: {}, mutation: false },
  { path: "chat.createSession", input: {}, mutation: true },
];

async function checkTrpc(items: CheckItem[]): Promise<void> {
  console.log("\n--- tRPC (probes) ---\n");

  for (const { path, input, mutation } of TRPC_PROBES) {
    let url = `${BASE_URL}/api/trpc/${path}`;
    let options: RequestInit = {};

    if (mutation) {
      options = { method: "POST", body: JSON.stringify({ json: input }) };
    } else {
      const inputParam = encodeURIComponent(JSON.stringify({ json: input }));
      url += `?input=${inputParam}`;
      options = { method: "GET" };
    }

    try {
      const { res, ms } = await fetchWithTiming(url, options);

      if (res.status === 401 || res.status === 403) {
        items.push({
          name: path,
          result: "auth_required",
          status: res.status,
          ms,
        });
        console.log(`🔒 ${path}  ${res.status}  ${ms}ms  需登录`);
        continue;
      }

      if (!res.ok) {
        items.push({
          name: path,
          result: "fail",
          status: res.status,
          ms,
          note: `HTTP ${res.status}`,
        });
        console.log(`❌ ${path}  ${res.status}  ${ms}ms  HTTP ${res.status}`);
        continue;
      }

      const data = (await res.json()) as { result?: { data?: { json?: unknown } }; error?: unknown };
      const hasJson =
        data && typeof data === "object" && data.result && typeof data.result.data === "object";
      const result: Result = hasJson ? "ok" : "fail";
      const note = hasJson ? undefined : "invalid tRPC response shape";

      items.push({
        name: path,
        result,
        status: res.status,
        ms,
        note,
      });
      console.log(`${result === "ok" ? "✅" : "❌"} ${path}  200  ${ms}ms  ${note ?? ""}`);
    } catch (e) {
      items.push({
        name: path,
        result: "fail",
        note: e instanceof Error ? e.message : String(e),
      });
      console.log(`❌ ${path}  fail  ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function main() {
  console.log(`API 连接检查  BASE_URL=${BASE_URL}\n`);

  const items: CheckItem[] = [];

  await checkRest(items);
  await checkTrpc(items);

  const ok = items.filter((i) => i.result === "ok").length;
  const authRequired = items.filter((i) => i.result === "auth_required").length;
  const fail = items.filter((i) => i.result === "fail").length;

  console.log("\n--- 汇总 ---");
  console.log(`  成功: ${ok}  需登录: ${authRequired}  失败: ${fail}`);

  const reportPath = process.env.REPORT_FILE;
  if (reportPath) {
    const fullPath = join(process.cwd(), reportPath);
    const report = buildReport(items, ok, authRequired, fail);
    writeFileSync(fullPath, report, "utf-8");
    console.log(`\n报告已写入: ${reportPath}`);
  }

  if (fail > 0) {
    console.log("\n存在连接失败，退出码 1。");
    process.exit(1);
  }
  console.log("\n全部通过或仅需登录，退出码 0。");
  process.exit(0);
}

function buildReport(
  items: CheckItem[],
  ok: number,
  authRequired: number,
  fail: number
): string {
  const restItems = items.filter((i) => i.name.startsWith("GET ") || i.name.startsWith("POST "));
  const trpcItems = items.filter((i) => !restItems.includes(i));
  const time = new Date().toISOString();
  const lines: string[] = [
    "# API 监测报告",
    "",
    `生成时间：${time}`,
    `BASE_URL：${BASE_URL}`,
    "",
    "## 汇总",
    "",
    `| 成功 | 需登录 | 失败 |`,
    `|------|--------|------|`,
    `| ${ok} | ${authRequired} | ${fail} |`,
    "",
    "## REST",
    "",
    "| 接口 | 状态 | 耗时(ms) | 备注 |",
    "|------|------|----------|------|",
    ...restItems.map(
      (i) =>
        `| ${i.name} | ${i.result === "ok" ? "✅" : i.result === "auth_required" ? "🔒" : "❌"} | ${i.ms ?? "-"} | ${i.note ?? ""} |`
    ),
    "",
    "## tRPC 探针",
    "",
    "| 接口 | 状态 | 耗时(ms) | 备注 |",
    "|------|------|----------|------|",
    ...trpcItems.map(
      (i) =>
        `| ${i.name} | ${i.result === "ok" ? "✅" : i.result === "auth_required" ? "🔒" : "❌"} | ${i.ms ?? "-"} | ${i.note ?? ""} |`
    ),
    "",
    "---",
    "",
    "生成方式：`REPORT_FILE=docs/api-monitor-report.md npm run check:api`",
  ];
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
