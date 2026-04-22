#!/usr/bin/env tsx
/**
 * 验证知识树层级：查询 health_foundation 模块，检查根节点及子节点存在。
 */
import "dotenv/config";
import { getDb } from "../server/db";
import { getKnowledgeTreeByModule } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available.");
    process.exit(1);
  }
  const tree = await getKnowledgeTreeByModule("health_foundation");
  const roots = tree;
  const hasRoots = roots.length >= 1;
  const withChildren = roots.filter((r) => r.children && r.children.length > 0);
  const hasHierarchy = withChildren.length > 0;

  console.log("health_foundation 根节点数:", roots.length);
  console.log("有子节点的根数:", withChildren.length);
  if (withChildren[0]) {
    console.log("示例根标题:", withChildren[0].title);
    console.log("其子节点数:", withChildren[0].children!.length);
  }

  if (hasRoots && hasHierarchy) {
    console.log("\n✅ 知识树层级验证通过。");
    process.exit(0);
  } else {
    console.error("\n❌ 验证未通过。");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
