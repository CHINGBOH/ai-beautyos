#!/usr/bin/env tsx
/**
 * 删除知识库中标题以「种子知识」开头的占位条目（可选清理）
 * 使用：tsx scripts/delete-seed-knowledge-placeholders.ts
 */
import "dotenv/config";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { like, inArray } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available. Set DATABASE_URL.");
    process.exit(1);
  }

  const toDelete = await db
    .select({ id: knowledgeBase.id, title: knowledgeBase.title })
    .from(knowledgeBase)
    .where(like(knowledgeBase.title, "种子知识%"));

  if (toDelete.length === 0) {
    console.log("未发现标题以「种子知识」开头的记录，无需删除。");
    return;
  }

  console.log(`发现 ${toDelete.length} 条占位条目，即将删除：`);
  toDelete.forEach((r) => console.log(`  - [${r.id}] ${r.title}`));

  const ids = toDelete.map((r) => r.id);
  await db.delete(knowledgeBase).where(inArray(knowledgeBase.id, ids));
  console.log(`\n已删除 ${ids.length} 条。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
