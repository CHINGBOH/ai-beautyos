/**
 * 共享：解析 kb 格式知识库文档（## 模块X：名称（module_id）、### X.Y 标题、摘要/正文/参考来源块）
 * 供 import-knowledge-from-docs.ts 与 consolidate-knowledge.ts 复用
 */
import { readFileSync } from "fs";

export const MODULE_ID_MAP: Record<string, string> = {
  医美技术: "aesthetics",
  皮肤管理: "skin_care",
  健康基础: "health_foundation",
  中医养生: "tcm",
  牙齿护理: "dental_care",
  体态管理: "posture",
  心理健康: "mental_health",
  科技美容: "tech_beauty",
  发型造型: "hair",
  服装搭配: "styling",
  妆容技巧: "makeup",
  香水香氛: "fragrance",
  社交礼仪: "etiquette",
  时间管理: "time_management",
  环境美学: "environment",
};

export interface ParsedEntry {
  moduleId: string;
  title: string;
  summary: string;
  content: string;
  sources?: string;
  category?: string;
}

export function extractModuleId(headerLine: string): string | null {
  const m = headerLine.match(/##\s*模块[^：:]*[：:]\s*[^（(]+[（(]([a-z_]+)[）)]/);
  if (m) return m[1];
  const m2 = headerLine.match(/[（(]([a-z_]+)[）)]\s*$/);
  return m2 ? m2[1] : null;
}

export function parseModuleBlock(block: string, fallbackModuleId: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const sections = block.split(/\n###\s+/).filter(Boolean);
  for (let i = 0; i < sections.length; i++) {
    const raw = i === 0 ? sections[i] : "### " + sections[i];
    const titleLine = raw.split("\n")[0];
    const title = titleLine.replace(/^###\s*/, "").replace(/^\d+\.\d+\s*/, "").trim();
    if (!title) continue;
    const summaryMatch = raw.match(/\*\*摘要[^*]*\*\*\s*\n([\s\S]*?)\n\s*\*\*正文\*\*/);
    const bodyMatch = raw.match(/\*\*正文\*\*\s*\n([\s\S]*?)(?=\n\s*\*\*参考来源\*\*|\n---|\n###\s|$)/);
    const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 500) : "";
    const content = bodyMatch ? bodyMatch[1].trim().slice(0, 50000) : "";
    if (!content && !summary) continue;
    const srcMatch = raw.match(/\*\*参考来源\*\*\s*\n([\s\S]*?)(?=\n---|\n###\s|$)/);
    const sources = srcMatch ? srcMatch[1].trim().slice(0, 2000) : undefined;
    entries.push({
      moduleId: fallbackModuleId,
      title,
      summary,
      content: content || summary,
      sources,
    });
  }
  return entries;
}

/** 解析标准 kb 格式文件（## 模块X：名称（module_id） + ### X.Y 标题 + 摘要/正文/参考来源） */
export function parseKbFile(filePath: string): ParsedEntry[] {
  const text = readFileSync(filePath, "utf-8");
  const entries: ParsedEntry[] = [];
  const moduleBlocks = text.split(/(?=^##\s*模块)/m).filter(Boolean);
  for (const block of moduleBlocks) {
    const firstLine = block.split("\n")[0];
    const moduleId = extractModuleId(firstLine);
    const id = moduleId || "aesthetics";
    const parsed = parseModuleBlock(block, id);
    parsed.forEach((p) => (p.moduleId = id));
    entries.push(...parsed);
  }
  return entries;
}
