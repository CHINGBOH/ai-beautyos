#!/usr/bin/env tsx
/**
 * 按 knowledge-content-checklist 框架整合 docs 下 7 个知识库文件 → 去重 → 输出 docs/knowledge-consolidated.md
 * 使用：npm run knowledge:consolidate
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseKbFile, type ParsedEntry } from "./lib/parse-kb-docs";
import { MODULE_NAMES } from "../shared/knowledge-modules";
import type { KnowledgeModule } from "../shared/knowledge-modules";

const DOCS_DIR = join(process.cwd(), "docs");
const CHECKLIST_PATH = join(DOCS_DIR, "knowledge-content-checklist.md");
const CONSOLIDATED_PATH = join(DOCS_DIR, "knowledge-consolidated.md");

const KB_FILES = ["kb_aesthetics_skin.md", "kb_batch2.md", "kb_batch3.md"];
const OTHER_FILES = [
  "医美诊所完整知识库.md",
  "医美知识库资料收集汇总.md",
  "医美诊所知识库_举一反三拓展版.md",
  "医美诊所极致体验版知识库_深圳顶级客户.md",
];

/** 从 checklist 解析：模块顺序 + 每模块的规范知识点标题列表 */
interface ChecklistFramework {
  moduleOrder: { moduleId: string; name: string }[];
  titlesByModule: Record<string, string[]>;
}

function loadChecklistFramework(): ChecklistFramework {
  const text = readFileSync(CHECKLIST_PATH, "utf-8");
  const moduleOrder: { moduleId: string; name: string }[] = [];
  const titlesByModule: Record<string, string[]> = {};

  const sectionRegex = /###\s+(\d+)\.\s+([^（(]+)[（(]([a-z_]+)[）)]\s*\n[\s\S]*?(?=\n###\s+\d+\.|$)/g;
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(text)) !== null) {
    const num = m[1];
    const name = m[2].trim();
    const moduleId = m[3];
    moduleOrder.push({ moduleId, name });
    const titles: string[] = [];
    const tableBlock = m[0];
    const rowRegex = /\|\s*□\s*\|\s*([^|]+)\s*\|/g;
    let rowMatch: RegExpExecArray | null;
    let first = true;
    while ((rowMatch = rowRegex.exec(tableBlock)) !== null) {
      if (first) {
        first = false;
        continue;
      }
      const title = rowMatch[1].trim();
      if (title && title !== "知识点标题") titles.push(title);
    }
    titlesByModule[moduleId] = titles;
  }
  return { moduleOrder, titlesByModule };
}

/** 中文序号 → module_id（医美诊所完整知识库：一…十七） */
const WANZHENG_CHAPTER_MAP: Record<string, string> = {
  一: "health_foundation",
  二: "skin_care",
  三: "aesthetics",
  四: "tcm",
  五: "dental_care",
  六: "posture",
  七: "tech_beauty",
  八: "mental_health",
  九: "mental_health",
  十: "aesthetics",
  十一: "aesthetics",
  十二: "aesthetics",
  十三: "aesthetics",
  十四: "aesthetics",
  十五: "aesthetics",
  十六: "aesthetics",
  十七: "aesthetics",
};

/** 医美知识库资料收集汇总：一…十一 */
const HUIZONG_CHAPTER_MAP: Record<string, string> = {
  一: "health_foundation",
  二: "skin_care",
  三: "aesthetics",
  四: "tcm",
  五: "dental_care",
  六: "posture",
  七: "tech_beauty",
  八: "mental_health",
  九: "fragrance",
  十: "etiquette",
  十一: "dental_care",
};

/** 举一反三拓展版：一…多，按标题关键词映射 */
function getJuyifanModule(chapterName: string): string {
  if (/健康|睡眠/.test(chapterName)) return "health_foundation";
  if (/皮肤|色斑/.test(chapterName)) return "skin_care";
  if (/医美技术|项目/.test(chapterName)) return "aesthetics";
  if (/中医|体质/.test(chapterName)) return "tcm";
  if (/客户画像|高净值|消费心理|心理/.test(chapterName)) return "mental_health";
  if (/话术|沟通|异议|成交/.test(chapterName)) return "aesthetics";
  if (/五感|空间|尊享|隐私|管家/.test(chapterName)) return "environment";
  if (/合规|客诉|医疗质量|私域|数字化|供应链|团队|财务|定价/.test(chapterName)) return "aesthetics";
  return "aesthetics";
}

/** 极致体验版：按标题关键词映射 */
function getJizhiModule(chapterName: string): string {
  if (/高净值|画像|消费心理|趋势/.test(chapterName)) return "mental_health";
  if (/五感|空间|尊享|隐私|管家/.test(chapterName)) return "environment";
  if (/美学|项目|联合|术后|生命周期|会员|话术|异议/.test(chapterName)) return "aesthetics";
  return "aesthetics";
}

/** 医美诊所完整知识库：## 一、健康基础 … ### 1.1 … */
function parseWanzheng(filePath: string): ParsedEntry[] {
  const text = readFileSync(filePath, "utf-8");
  const entries: ParsedEntry[] = [];
  const chapterBlocks = text.split(/(?=^##\s+[一二三四五六七八九十]+[、．])/m).filter(Boolean);
  for (const block of chapterBlocks) {
    const firstLine = block.split("\n")[0];
    const chapterMatch = firstLine.match(/##\s+([一二三四五六七八九十]+)[、．]\s*(.*)/);
    if (!chapterMatch) continue;
    const numKey = chapterMatch[1];
    const moduleId = WANZHENG_CHAPTER_MAP[numKey] || "aesthetics";
    const sections = block.split(/\n###\s+\d+\.\d+\s+/).filter(Boolean);
    for (let i = 0; i < sections.length; i++) {
      const raw = sections[i];
      const titleMatch = raw.match(/^([^\n]+)/);
      const title = titleMatch ? titleMatch[1].trim() : "";
      if (!title || title.length > 200) continue;
      let body = raw.slice(title.length).trim();
      body = body.replace(/^#+\s.*$/gm, "").trim();
      body = body.split(/\n###\s+/)[0].trim().slice(0, 50000);
      if (!body || body.length < 15) continue;
      const summary = body.slice(0, 120).replace(/\n/g, " ").trim();
      entries.push({ moduleId, title, summary, content: body, sources: undefined });
    }
  }
  return entries;
}

/** 医美知识库资料收集汇总：## 一、健康基础模块 … ### 1. … */
function parseHuizong(filePath: string): ParsedEntry[] {
  const text = readFileSync(filePath, "utf-8");
  const entries: ParsedEntry[] = [];
  const chapterBlocks = text.split(/(?=^##\s+[一二三四五六七八九十]+[、．])/m).filter(Boolean);
  for (const block of chapterBlocks) {
    const firstLine = block.split("\n")[0];
    const chapterMatch = firstLine.match(/##\s+([一二三四五六七八九十]+)[、．]\s*(.*?)(模块)?\s*$/);
    if (!chapterMatch) continue;
    const numKey = chapterMatch[1];
    const moduleId = HUIZONG_CHAPTER_MAP[numKey] || "aesthetics";
    const sections = block.split(/\n###\s+\d+\.\s+/).filter(Boolean);
    for (let i = 0; i < sections.length; i++) {
      const raw = sections[i];
      const titleMatch = raw.match(/^([^\n]+)/);
      let title = titleMatch ? titleMatch[1].trim() : "";
      title = title.replace(/^\d+\.\s*/, "");
      if (!title || title.length > 200) continue;
      let body = raw.slice((titleMatch ? titleMatch[0] : "").length).trim();
      body = body.replace(/^#+\s.*$/gm, "").trim();
      body = body.split(/\n###\s+/)[0].trim().slice(0, 50000);
      if (!body || body.length < 15) continue;
      const summary = body.slice(0, 120).replace(/\n/g, " ").trim();
      entries.push({ moduleId, title, summary, content: body, sources: undefined });
    }
  }
  return entries;
}

/** 举一反三：## 一、健康基础与睡眠科学 … ### 1.1 … */
function parseJuyifan(filePath: string): ParsedEntry[] {
  const text = readFileSync(filePath, "utf-8");
  const entries: ParsedEntry[] = [];
  const chapterBlocks = text.split(/(?=^##\s+[一二三四五六七八九十百零\d]+[、．])/m).filter(Boolean);
  for (const block of chapterBlocks) {
    const firstLine = block.split("\n")[0];
    const chapterMatch = firstLine.match(/##\s+([一二三四五六七八九十百零\d]+)[、．]\s*(.*?)(\s*⭐|$)/);
    if (!chapterMatch) continue;
    const chapterName = (chapterMatch[2] || "").trim();
    const moduleId = getJuyifanModule(chapterName);
    const sections = block.split(/\n###\s+\d+\.\d+\s+/).filter(Boolean);
    for (let i = 0; i < sections.length; i++) {
      const raw = sections[i];
      const titleMatch = raw.match(/^([^\n]+)/);
      const title = titleMatch ? titleMatch[1].trim() : "";
      if (!title || title.length > 200) continue;
      let body = raw.slice(title.length).trim();
      body = body.replace(/^#+\s.*$/gm, "").trim();
      body = body.split(/\n###\s+/)[0].trim().slice(0, 50000);
      if (!body || body.length < 15) continue;
      const summary = body.slice(0, 120).replace(/\n/g, " ").trim();
      entries.push({ moduleId, title, summary, content: body, sources: undefined });
    }
  }
  return entries;
}

/** 极致体验版：## 一、深圳高净值人群画像 … ### 1.1 … */
function parseJizhi(filePath: string): ParsedEntry[] {
  const text = readFileSync(filePath, "utf-8");
  const entries: ParsedEntry[] = [];
  const chapterBlocks = text.split(/(?=^##\s+[一二三四五六七八九十\d]+[、．])/m).filter(Boolean);
  for (const block of chapterBlocks) {
    const firstLine = block.split("\n")[0];
    const chapterMatch = firstLine.match(/##\s+[一二三四五六七八九十\d]+[、．]\s*(.*)/);
    if (!chapterMatch) continue;
    const chapterName = (chapterMatch[1] || "").trim();
    const moduleId = getJizhiModule(chapterName);
    const sections = block.split(/\n###\s+\d+\.\d+\s+/).filter(Boolean);
    for (let i = 0; i < sections.length; i++) {
      const raw = sections[i];
      const titleMatch = raw.match(/^([^\n]+)/);
      const title = titleMatch ? titleMatch[1].trim() : "";
      if (!title || title.length > 200) continue;
      let body = raw.slice(title.length).trim();
      body = body.replace(/^#+\s.*$/gm, "").trim();
      body = body.split(/\n###\s+/)[0].trim().slice(0, 50000);
      if (!body || body.length < 15) continue;
      const summary = body.slice(0, 120).replace(/\n/g, " ").trim();
      entries.push({ moduleId, title, summary, content: body, sources: undefined });
    }
  }
  return entries;
}

/** 将原标题规范为 checklist 中的知识点标题（包含匹配） */
function normalizeTitle(
  moduleId: string,
  title: string,
  titlesByModule: Record<string, string[]>
): string {
  const list = titlesByModule[moduleId];
  if (!list || !list.length) return title;
  const t = title.trim();
  for (const canonical of list) {
    if (canonical === t) return canonical;
    if (t.includes(canonical) || canonical.includes(t)) return canonical;
  }
  return title;
}

/** 去重键 */
function dedupKey(moduleId: string, title: string): string {
  return `${moduleId}\t${title}`;
}

/** 合并两条：保留有摘要的；正文取更长；来源拼接 */
function mergeEntries(existing: ParsedEntry, incoming: ParsedEntry): ParsedEntry {
  const summary = existing.summary || incoming.summary || existing.content.slice(0, 150);
  const content =
    (existing.content.length >= incoming.content.length ? existing.content : incoming.content) ||
    existing.content;
  let sources = existing.sources;
  if (incoming.sources) {
    sources = sources ? `${sources}\n\n---\n${incoming.sources}` : incoming.sources;
  }
  return {
    moduleId: existing.moduleId,
    title: existing.title,
    summary,
    content,
    sources: sources?.slice(0, 2000),
    category: existing.category || incoming.category,
  };
}

function main() {
  console.log("加载 checklist 框架...");
  const framework = loadChecklistFramework();
  const moduleIndex = new Map<string, number>();
  framework.moduleOrder.forEach((m, i) => moduleIndex.set(m.moduleId, i));

  const merged = new Map<string, ParsedEntry>();
  const fileOrder = [...KB_FILES, ...OTHER_FILES];

  for (const file of fileOrder) {
    const path = join(DOCS_DIR, file);
    let entries: ParsedEntry[] = [];
    try {
      if (KB_FILES.includes(file)) {
        entries = parseKbFile(path);
      } else if (file === "医美诊所完整知识库.md") {
        entries = parseWanzheng(path);
      } else if (file === "医美知识库资料收集汇总.md") {
        entries = parseHuizong(path);
      } else if (file === "医美诊所知识库_举一反三拓展版.md") {
        entries = parseJuyifan(path);
      } else if (file === "医美诊所极致体验版知识库_深圳顶级客户.md") {
        entries = parseJizhi(path);
      }
      console.log(`  ${file}: 解析出 ${entries.length} 条`);
    } catch (e) {
      console.warn(`  跳过 ${file}:`, (e as Error).message);
      continue;
    }

    for (const e of entries) {
      const normalizedTitle = normalizeTitle(e.moduleId, e.title, framework.titlesByModule);
      const key = dedupKey(e.moduleId, normalizedTitle);
      const existing = merged.get(key);
      const entryToAdd: ParsedEntry = {
        ...e,
        title: normalizedTitle,
      };
      if (existing) {
        merged.set(key, mergeEntries(existing, entryToAdd));
      } else {
        merged.set(key, entryToAdd);
      }
    }
  }

  const allEntries = Array.from(merged.values());
  console.log(`\n去重后共 ${allEntries.length} 条，生成总文档...`);

  const byModule = new Map<string, ParsedEntry[]>();
  for (const e of allEntries) {
    const list = byModule.get(e.moduleId) || [];
    list.push(e);
    byModule.set(e.moduleId, list);
  }

  const outputModules = framework.moduleOrder;
  const lines: string[] = [
    "# 知识库整合稿（按 checklist 框架去重合并）",
    "",
    "> 由 scripts/consolidate-knowledge.ts 生成，来源：kb_*.md + 医美诊所完整/汇总/举一反三/极致体验",
    "",
    "---",
    "",
  ];

  let sectionIndex = 0;
  for (const { moduleId, name } of outputModules) {
    const list = byModule.get(moduleId);
    if (!list || list.length === 0) continue;
    sectionIndex++;
    const modName = MODULE_NAMES[moduleId as KnowledgeModule] || name;
    lines.push(`## 模块${sectionIndex}：${modName}（${moduleId}）`);
    lines.push("");
    lines.push("---");
    lines.push("");
    list.forEach((e, i) => {
      const num = `${sectionIndex}.${i + 1}`;
      lines.push(`### ${num} ${e.title}`);
      lines.push("");
      lines.push("**摘要**");
      lines.push(e.summary || e.content.slice(0, 100).replace(/\n/g, " "));
      lines.push("");
      lines.push("**正文**");
      lines.push("");
      lines.push(e.content);
      lines.push("");
      if (e.sources) {
        lines.push("**参考来源**");
        lines.push("");
        lines.push(e.sources);
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    });
  }

  writeFileSync(CONSOLIDATED_PATH, lines.join("\n"), "utf-8");
  console.log(`\n已写入 ${CONSOLIDATED_PATH}`);
}

main();
