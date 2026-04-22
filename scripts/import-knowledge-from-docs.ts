#!/usr/bin/env tsx
/**
 * 从 docs 下的知识库整理稿解析 ## 模块、### 小节（摘要+正文），写入 knowledge_base 表。
 * 默认：kb_aesthetics_skin.md、kb_batch2.md、kb_batch3.md
 * 仅导入整合稿：CONSOLIDATED=1 或 --consolidated 时只读 docs/knowledge-consolidated.md
 * 导入时按 knowledgeStructure 解析 path/level/order 并写入 parentId，形成知识树。
 */
import "dotenv/config";
import { join } from "path";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { parseKbFile } from "./lib/parse-kb-docs";
import { knowledgeStructure } from "./generate-and-import-knowledge";

const DOCS_DIR = join(process.cwd(), "docs");
const DEFAULT_FILES = ["kb_aesthetics_skin.md", "kb_batch2.md", "kb_batch3.md"];
const CONSOLIDATED_FILE = "knowledge-consolidated.md";

type HierarchyCell = { path: string; level: number; order: number };

function buildHierarchyMap(): Map<string, HierarchyCell> {
  const map = new Map<string, HierarchyCell>();
  for (const node of knowledgeStructure) {
    const key = `${node.module}\t${node.title}`;
    map.set(key, { path: node.path, level: node.level, order: node.order });
  }
  return map;
}

function assignPathLevelOrder(
  entries: { moduleId: string; title: string; summary: string; content: string; sources?: string }[],
  hierarchyMap: Map<string, HierarchyCell>
): { moduleId: string; title: string; summary: string; content: string; sources?: string; path: string; level: number; order: number }[] {
  const withMeta = entries.map((e) => {
    const key = `${e.moduleId}\t${e.title}`;
    const cell = hierarchyMap.get(key);
    if (cell) return { ...e, path: cell.path, level: cell.level, order: cell.order };
    return { ...e, path: "", level: 0, order: 0 };
  });
  const byModule = new Map<string, typeof withMeta>();
  for (const e of withMeta) {
    if (!byModule.has(e.moduleId)) byModule.set(e.moduleId, []);
    byModule.get(e.moduleId)!.push(e);
  }
  for (const [, list] of byModule) {
    const needFallback = list.filter((e) => !e.path);
    needFallback.forEach((e, i) => {
      if (i === 0) {
        (e as { path: string; level: number; order: number }).path = "1";
        (e as { path: string; level: number; order: number }).level = 1;
        (e as { path: string; level: number; order: number }).order = 1;
      } else {
        (e as { path: string; level: number; order: number }).path = `1/${i + 1}`;
        (e as { path: string; level: number; order: number }).level = 2;
        (e as { path: string; level: number; order: number }).order = i + 1;
      }
    });
  }
  return withMeta as { moduleId: string; title: string; summary: string; content: string; sources?: string; path: string; level: number; order: number }[];
}

async function main() {
  const useConsolidated =
    process.env.CONSOLIDATED === "1" || process.argv.includes("--consolidated");
  const FILES = useConsolidated ? [CONSOLIDATED_FILE] : DEFAULT_FILES;

  const db = await getDb();
  if (!db) {
    console.error("Database not available. Set DATABASE_URL.");
    process.exit(1);
  }

  const allEntries: { moduleId: string; title: string; summary: string; content: string; sources?: string }[] = [];
  for (const file of FILES) {
    const path = join(DOCS_DIR, file);
    try {
      const entries = parseKbFile(path);
      allEntries.push(...entries);
      console.log(`  ${file}: 解析出 ${entries.length} 条`);
    } catch (e) {
      console.warn(`  跳过 ${file}:`, (e as Error).message);
    }
  }

  const hierarchyMap = buildHierarchyMap();
  const withPath = assignPathLevelOrder(allEntries, hierarchyMap);
  withPath.sort((a, b) => {
    if (a.moduleId !== b.moduleId) return a.moduleId.localeCompare(b.moduleId);
    return a.path.localeCompare(b.path, undefined, { numeric: true });
  });

  console.log(`\n共 ${withPath.length} 条（已按 module, path 排序），开始写入...\n`);
  let inserted = 0;
  let skipped = 0;
  const idMap = new Map<string, number>();

  for (const e of withPath) {
    const existing = await db
      .select({ id: knowledgeBase.id, path: knowledgeBase.path })
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.module, e.moduleId), eq(knowledgeBase.title, e.title)))
      .limit(1);
    if (existing[0]?.id) {
      skipped++;
      const path = existing[0].path ?? e.path;
      idMap.set(`${e.moduleId}\t${path}`, existing[0].id);
      continue;
    }

    let parentId: number | null = null;
    if (e.path.includes("/")) {
      const parentPath = e.path.split("/").slice(0, -1).join("/");
      parentId = idMap.get(`${e.moduleId}\t${parentPath}`) ?? null;
    }

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
        sources: e.sources ? JSON.stringify([{ type: "doc_import", text: e.sources.slice(0, 1500) }]) : null,
      })
      .returning({ id: knowledgeBase.id });

    const id = result[0]?.id;
    if (id) {
      idMap.set(`${e.moduleId}\t${e.path}`, id);
      inserted++;
      console.log(`  [${inserted}] ${e.moduleId} / ${e.path} / ${e.title.slice(0, 28)}...`);
    }
  }

  console.log(`\n完成：新增 ${inserted} 条，已存在跳过 ${skipped} 条。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
