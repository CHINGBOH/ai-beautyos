#!/usr/bin/env tsx
/**
 * 解析 docs/Kimi_Agent_医美知识库扩展.zip 内 md 文件（## 一、模块 / ### 1.1 标题 结构），写入 knowledge_base。
 * 使用：tsx scripts/import-knowledge-from-kimi-zip.ts
 */
import "dotenv/config";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createReadStream } from "fs";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
// @ts-ignore - unzipper has no types
import unzipper from "unzipper";

const DOCS_DIR = join(process.cwd(), "docs");
const ZIP_PATH = join(DOCS_DIR, "Kimi_Agent_医美知识库扩展.zip");
const EXTRACT_DIR = join(DOCS_DIR, "kb_kimi_extract");

/** ## 一、XXX 或 ## 九、客户画像 等 -> moduleId；运营/客户类归 aesthetics + category */
function sectionToModuleAndCategory(sectionTitle: string): { module: string; category: string } {
  const t = sectionTitle.replace(/^[一二三四五六七八九十百廿\d、]+\.?\s*/, "").trim();
  if (/健康基础|睡眠/.test(t)) return { module: "health_foundation", category: "项目介绍" };
  if (/皮肤管理|色斑/.test(t)) return { module: "skin_care", category: "项目介绍" };
  if (/医美技术|激光|注射|光电/.test(t)) return { module: "aesthetics", category: "项目介绍" };
  if (/中医养生|体质|食疗/.test(t)) return { module: "tcm", category: "项目介绍" };
  if (/牙齿|口腔|正畸|冷光美白|瓷贴面|牙周/.test(t)) return { module: "dental_care", category: "项目介绍" };
  if (/体态/.test(t)) return { module: "posture", category: "项目介绍" };
  if (/科技美容|美容仪|AI皮肤|数字化/.test(t)) return { module: "tech_beauty", category: "项目介绍" };
  if (/心理健康|压力|心理/.test(t)) return { module: "mental_health", category: "心理分析" };
  if (/香水|香氛|香调/.test(t)) return { module: "fragrance", category: "项目介绍" };
  if (/社交礼仪|礼仪/.test(t)) return { module: "etiquette", category: "项目介绍" };
  if (/客户画像|高净值|消费心理|消费趋势/.test(t)) return { module: "aesthetics", category: "心理分析" };
  if (/销售话术|沟通技巧|话术/.test(t)) return { module: "aesthetics", category: "销售话术" };
  if (/异议处理/.test(t)) return { module: "aesthetics", category: "异议处理" };
  if (/成交技巧|压单/.test(t)) return { module: "aesthetics", category: "成交技巧" };
  if (/FAQ|常见问题/.test(t)) return { module: "aesthetics", category: "FAQ" };
  if (/术后护理|并发症/.test(t)) return { module: "aesthetics", category: "注意事项" };
  if (/项目对比|选择指南|联合治疗/.test(t)) return { module: "aesthetics", category: "项目介绍" };
  if (/价格政策|套餐|定价/.test(t)) return { module: "aesthetics", category: "价格政策" };
  if (/五感空间|尊享服务|SOP|隐私|私人管家|极致体验/.test(t)) return { module: "aesthetics", category: "项目介绍" };
  if (/美学诊疗|定制方案|联合治疗方案/.test(t)) return { module: "aesthetics", category: "项目介绍" };
  if (/术后.*尊享|生命周期|VIP会员/.test(t)) return { module: "aesthetics", category: "项目介绍" };
  if (/顾问话术|异议处理策略/.test(t)) return { module: "aesthetics", category: "销售话术" };
  if (/法规|合规|客诉|危机|医疗质量|安全/.test(t)) return { module: "aesthetics", category: "注意事项" };
  if (/私域|客户管理|数字化运营|数据分/.test(t)) return { module: "aesthetics", category: "项目介绍" };
  if (/供应链|正品|库存|成本控/.test(t)) return { module: "aesthetics", category: "价格政策" };
  if (/员工培训|考核|激励|晋升|团队文化/.test(t)) return { module: "aesthetics", category: "项目介绍" };
  if (/成本结构|盈利|定价策略|财务风控|税务/.test(t)) return { module: "aesthetics", category: "价格政策" };
  return { module: "aesthetics", category: "项目介绍" };
}

interface KimiEntry {
  module: string;
  category: string;
  title: string;
  summary: string;
  content: string;
  sourceFile: string;
}

function parseKimiMarkdown(filePath: string, fileName: string): KimiEntry[] {
  const text = readFileSync(filePath, "utf-8");
  const entries: KimiEntry[] = [];
  const parts = text.split(/\n(?=##\s+)/).filter(Boolean);
  for (const part of parts) {
    const firstLine = part.split("\n")[0];
    if (/^##\s*目录\s*$/.test(firstLine) || /^##\s*参考来源\s*$/.test(firstLine) || /^##\s*使用说明\s*$/.test(firstLine)) continue;
    const sectionMatch = firstLine.match(/^##\s+(.+?)(?:\s*$|\s*#)/);
    const sectionTitle = sectionMatch ? sectionMatch[1].trim() : "";
    const { module, category } = sectionToModuleAndCategory(sectionTitle);
    const subBlocks = part.split(/\n(?=###\s+)/).slice(1);
    for (const block of subBlocks) {
      const line1 = block.split("\n")[0];
      const titleMatch = line1.match(/^###\s+(.+?)$/);
      const title = titleMatch ? titleMatch[1].replace(/^\d+\.?\d*\s*/, "").trim() : "";
      const body = block.slice(line1.length).trim().replace(/^\n+/, "");
      if (!title || body.length < 20) continue;
      const summary = body.slice(0, 300).replace(/\n+/g, " ").trim();
      entries.push({
        module,
        category,
        title,
        summary,
        content: body.slice(0, 50000),
        sourceFile: fileName,
      });
    }
  }
  return entries;
}

async function ensureExtracted(): Promise<string> {
  if (existsSync(EXTRACT_DIR)) {
    try {
      const files = require("fs").readdirSync(EXTRACT_DIR).filter((f: string) => f.endsWith(".md"));
      if (files.length > 0) return EXTRACT_DIR;
    } catch (_) {}
  }
  if (!existsSync(ZIP_PATH)) {
    throw new Error(`ZIP not found: ${ZIP_PATH}`);
  }
  mkdirSync(EXTRACT_DIR, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    createReadStream(ZIP_PATH)
      .pipe(unzipper.Extract({ path: EXTRACT_DIR }))
      .on("close", () => resolve())
      .on("error", reject);
  });
  return EXTRACT_DIR;
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available. Set DATABASE_URL.");
    process.exit(1);
  }

  let extractDir: string;
  try {
    extractDir = await ensureExtracted();
  } catch (e) {
    console.error("Extract failed. Ensure zip exists or extract manually to docs/kb_kimi_extract:", (e as Error).message);
    process.exit(1);
  }

  let searchDir = extractDir;
  let mdFiles = readdirSync(extractDir).filter((f: string) => f.endsWith(".md"));
  if (mdFiles.length === 0) {
    const subdirs = readdirSync(extractDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    if (subdirs.length === 1) {
      searchDir = join(extractDir, subdirs[0].name);
      mdFiles = readdirSync(searchDir).filter((f: string) => f.endsWith(".md"));
    }
  }
  const allEntries: KimiEntry[] = [];
  for (const f of mdFiles) {
    const path = join(searchDir, f);
    const entries = parseKimiMarkdown(path, f);
    allEntries.push(...entries);
    console.log(`  ${f}: 解析出 ${entries.length} 条`);
  }

  console.log(`\n共解析 ${allEntries.length} 条，开始写入...\n`);
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < allEntries.length; i++) {
    const e = allEntries[i];
    const existing = await db
      .select({ id: knowledgeBase.id })
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.module, e.module), eq(knowledgeBase.title, e.title)))
      .limit(1);
    if (existing[0]?.id) {
      skipped++;
      continue;
    }
    await db.insert(knowledgeBase).values({
      module: e.module,
      title: e.title,
      summary: e.summary || null,
      content: e.content,
      category: e.category,
      type: "customer",
      isActive: 1,
      viewCount: 0,
      usedCount: 0,
      credibility: 7,
      difficulty: "intermediate",
      level: 1,
      order: 1000 + i,
      sources: JSON.stringify([{ type: "kimi_zip", file: e.sourceFile }]),
    });
    inserted++;
    console.log(`  [${inserted}] ${e.module} / ${e.title.slice(0, 28)}...`);
  }

  console.log(`\n完成：新增 ${inserted} 条，已存在跳过 ${skipped} 条。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
