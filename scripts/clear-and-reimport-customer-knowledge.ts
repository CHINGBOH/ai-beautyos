#!/usr/bin/env tsx
/**
 * 清空客户知识库 → 重新导入整合稿（带 path/parentId）→ 验证知识树层级
 * 使用：tsx scripts/clear-and-reimport-customer-knowledge.ts
 */
import "dotenv/config";
import { execSync } from "child_process";
import { getDb } from "../server/db";
import { getKnowledgeTreeByModule } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available. Set DATABASE_URL.");
    process.exit(1);
  }

  console.log("1. 清空客户知识库 (type=customer)...");
  await db.delete(knowledgeBase).where(eq(knowledgeBase.type, "customer"));
  console.log("   已删除客户知识库记录。\n");

  console.log("2. 重新导入整合稿 (path/parentId 写入)...");
  execSync("npm run knowledge:import-consolidated", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, CONSOLIDATED: "1" },
  });

  console.log("\n3. 验证知识树层级 (health_foundation)...");
  const tree = await getKnowledgeTreeByModule("health_foundation");
  const roots = tree;
  const hasRoots = roots.length >= 1;
  const firstRootWithChildren = roots.find((r) => r.children && r.children.length > 0);
  const hasHierarchy = !!firstRootWithChildren;

  console.log(`   根节点数: ${roots.length}`);
  console.log(`   首根子节点数: ${roots[0]?.children?.length ?? 0}`);
  if (firstRootWithChildren && firstRootWithChildren.children!.length > 0) {
    const firstChild = firstRootWithChildren.children![0];
    console.log(`   首根首子标题: ${firstChild.title?.slice(0, 30)}...`);
  }

  if (hasRoots && hasHierarchy) {
    console.log("\n✅ 验证通过：知识树存在根节点且具备层级（parentId 关联正确）。");
  } else {
    console.error("\n❌ 验证未通过：根节点不足或无子节点。");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
