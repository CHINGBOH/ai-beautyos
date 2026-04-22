#!/usr/bin/env tsx
/**
 * 导入中文格式知识库文档（## 一、模块名、### N.M 标题、#### 子标题）
 * 与现有 parse-kb-docs.ts（## 模块X：名称（module_id）格式）互补。
 *
 * 用法：DEEPSEEK_API_KEY=sk-dummy npx tsx scripts/import-chinese-docs.ts
 */
import "dotenv/config";
import { join } from "path";
import { readFileSync } from "fs";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const DOCS_DIR = join(process.cwd(), "docs");

const FILES = [
  "医美诊所完整知识库.md",
  "医美诊所极致体验版知识库_深圳顶级客户.md",
  "医美诊所知识库_举一反三拓展版.md",
  "医美知识库资料收集汇总.md",
];

// Broad mapping: Chinese module name → module_id
const MODULE_ID_MAP: Record<string, string> = {
  健康基础: "health_foundation",
  皮肤管理: "skin_care",
  皮肤: "skin_care",
  医美技术: "aesthetics",
  医美: "aesthetics",
  中医养生: "tcm",
  中医: "tcm",
  牙齿护理: "dental_care",
  口腔: "dental_care",
  体态管理: "posture",
  体态: "posture",
  科技美容: "tech_beauty",
  科技: "tech_beauty",
  心理健康: "mental_health",
  心理: "mental_health",
  香水香氛: "fragrance",
  香水: "fragrance",
  社交礼仪: "etiquette",
  礼仪: "etiquette",
  发型: "hair",
  头发: "hair",
  穿搭: "styling",
  形象: "styling",
  彩妆: "makeup",
  妆容: "makeup",
  时间管理: "time_management",
  环境: "environment",
  空间: "environment",
  正畸: "dental_care",
  面型: "dental_care",
};

// Chinese numeral mapping for order extraction
const CHINESE_NUM: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15,
  十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20,
  二十一: 21, 二十二: 22, 二十三: 23, 二十四: 24,
  二十五: 25, 二十六: 26, 二十七: 27,
};

interface RawEntry {
  moduleId: string;
  moduleOrder: number;
  moduleName: string;
  title: string;
  summary: string;
  content: string;
  level: number;
  order: number;
  path: string;
}

/**
 * Match a Chinese module name from a header like "## 一、健康基础" or "## 一、健康基础模块"
 * Returns the module ID or null if not a knowledge module.
 */
function resolveModuleId(headerText: string): { id: string; order: number; name: string } | null {
  // Extract Chinese numeral + name: "一、健康基础" or "一、健康基础模块"
  const m = headerText.match(/^[一二三四五六七八九十]+[、.]\s*(.+)/);
  if (!m) return null;
  let rawName = m[1].trim();
  // Strip trailing 模块/篇/部分
  rawName = rawName.replace(/(模块|篇|部分)$/, "").trim();

  // Try exact match first
  if (MODULE_ID_MAP[rawName]) {
    return { id: MODULE_ID_MAP[rawName], order: CHINESE_NUM[headerText.match(/^[一二三四五六七八九十]+/)![0]] || 0, name: rawName };
  }
  // Try prefix match
  for (const [key, id] of Object.entries(MODULE_ID_MAP)) {
    if (rawName.startsWith(key) || key.startsWith(rawName)) {
      return { id, order: CHINESE_NUM[headerText.match(/^[一二三四五六七八九十]+/)![0]] || 0, name: key };
    }
  }
  return null;
}

/**
 * Parse a single markdown file into hierarchical RawEntry list.
 *
 * Structure:
 *   ## 一、健康基础          → level 1 (module root)
 *   ### 1.1 睡眠科学         → level 2 (section)
 *   ### 1.2 饮食营养         → level 2
 *   #### 子标题              → part of parent level 2 content (not separate entry)
 */
function parseFile(filePath: string): RawEntry[] {
  const text = readFileSync(filePath, "utf-8");
  const lines = text.split("\n");
  const entries: RawEntry[] = [];

  let currentModule: { id: string; order: number; name: string } | null = null;
  let currentSection: { title: string; lines: string[]; order: number; sectionNum: string } | null = null;

  function flushSection() {
    if (!currentSection || !currentModule) return;
    const raw = currentSection.lines.join("\n").trim();
    if (!raw) return;

    // Extract summary: first non-empty paragraph (before first bold label or double newline)
    const summary = extractSummary(raw);
    const content = raw.slice(0, 50000);
    if (!content && !summary) return;

    const sectionOrder = currentSection.order;
    const path = String(sectionOrder);

    entries.push({
      moduleId: currentModule.id,
      moduleOrder: currentModule.order,
      moduleName: currentModule.name,
      title: currentSection.title,
      summary: summary.slice(0, 500),
      content,
      level: 2,
      order: sectionOrder,
      path,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Level 1: ## 一、模块名
    const h2Match = line.match(/^##\s+([一二三四五六七八九十]+[、.].+)/);
    if (h2Match) {
      flushSection();
      currentSection = null;
      const mod = resolveModuleId(h2Match[1]);
      currentModule = mod;
      continue;
    }

    // If not in a known module, skip
    if (!currentModule) continue;

    // Level 2: ### N.M 标题  OR  ### N. 标题  OR  ### N 标题
    const h3Match = line.match(/^###\s+(\d+)(?:\.(\d*))?\s+(.+)/);
    if (h3Match) {
      flushSection();
      const order = parseInt(h3Match[1], 10);
      const subOrder = h3Match[2] ? parseInt(h3Match[2], 10) : 0;
      const title = h3Match[3].trim();
      const sectionNum = subOrder ? `${order}.${subOrder}` : String(order);
      currentSection = { title, lines: [], order, sectionNum };
      continue;
    }

    // Level 3 headers (####) are included as part of current section content
    // Lines outside any section are ignored
    if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  // Flush last section
  flushSection();
  return entries;
}

function extractSummary(content: string): string {
  const lines = content.split("\n");
  let summaryLines: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines before summary starts
    if (!collecting && !trimmed) continue;
    // Skip #### headers
    if (trimmed.startsWith("####")) continue;
    // Start of bold label (e.g., **核心发现**) means stop summary
    if (collecting && /^\*\*[^*]+\*\*/.test(trimmed)) break;
    // Table rows stop summary
    if (collecting && trimmed.startsWith("|")) break;
    // Second empty line after collecting means end of paragraph
    if (collecting && !trimmed) break;

    if (!collecting) collecting = true;
    summaryLines.push(trimmed);
  }
  return summaryLines.join(" ").slice(0, 500);
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available. Set DATABASE_URL.");
    process.exit(1);
  }

  // Parse all files
  const allEntries: RawEntry[] = [];
  for (const file of FILES) {
    const path = join(DOCS_DIR, file);
    try {
      const entries = parseFile(path);
      console.log(`  ${file}: 解析出 ${entries.length} 条 level-2 条目`);
      allEntries.push(...entries);
    } catch (e) {
      console.warn(`  跳过 ${file}: ${(e as Error).message}`);
    }
  }

  console.log(`\n共解析 ${allEntries.length} 条条目`);

  // Group by module for stats
  const byModule = new Map<string, RawEntry[]>();
  for (const e of allEntries) {
    if (!byModule.has(e.moduleId)) byModule.set(e.moduleId, []);
    byModule.get(e.moduleId)!.push(e);
  }
  console.log("\n按模块统计：");
  for (const [mod, list] of byModule) {
    console.log(`  ${mod}: ${list.length} 条`);
  }

  // Sort entries: by module order, then by section order
  allEntries.sort((a, b) => {
    if (a.moduleId !== b.moduleId) return a.moduleOrder - b.moduleOrder;
    return a.order - b.order;
  });

  // Insert into DB
  console.log("\n开始写入数据库...\n");
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const idMap = new Map<string, number>(); // "moduleId\torder" → id (for parentId linking)

  for (const e of allEntries) {
    try {
      // Check for duplicate by (module + title)
      const existing = await db
        .select({ id: knowledgeBase.id })
        .from(knowledgeBase)
        .where(
          and(
            eq(knowledgeBase.module, e.moduleId),
            eq(knowledgeBase.title, e.title)
          )
        )
        .limit(1);

      if (existing[0]?.id) {
        skipped++;
        idMap.set(`${e.moduleId}\t${e.path}`, existing[0].id);
        continue;
      }

      // All entries are level 2 (sections under module root)
      const parentId: number | null = null;

      const result = await db
        .insert(knowledgeBase)
        .values({
          module: e.moduleId,
          title: e.title,
          summary: e.summary || null,
          content: e.content,
          category: "项目介绍",
          type: "customer",
          isActive: 1,
          viewCount: 0,
          usedCount: 0,
          credibility: 8,
          difficulty: "intermediate",
          level: e.level,
          path: e.path,
          order: e.order,
          parentId,
          sources: JSON.stringify([{ type: "chinese_doc_import", text: e.moduleName }]),
        })
        .returning({ id: knowledgeBase.id });

      const id = result[0]?.id;
      if (id) {
        idMap.set(`${e.moduleId}\t${e.path}`, id);
        inserted++;
        console.log(`  [${inserted}] ${e.moduleId} / ${e.path} / ${e.title.slice(0, 40)}...`);
      }
    } catch (err) {
      errors++;
      console.error(`  [ERROR] ${e.moduleId} / ${e.title}: ${(err as Error).message}`);
    }
  }

  console.log(`\n完成：新增 ${inserted} 条，已存在跳过 ${skipped} 条，错误 ${errors} 条。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
