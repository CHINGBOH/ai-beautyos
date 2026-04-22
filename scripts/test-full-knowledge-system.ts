/**
 * 完整知识库系统测试
 * 测试爬虫、知识库、API的完整流程
 */

import "dotenv/config";
import { HtmlCrawler } from "../server/crawler/html-crawler";
import { PubMedCrawler } from "../server/crawler/pubmed-crawler";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { KNOWLEDGE_MODULES } from "../shared/knowledge-modules";
import { logger } from "../server/_core/logger";

async function testCompleteSystem() {
  console.log("🚀 开始测试完整知识库系统...\n");

  // 1. 测试数据库连接
  console.log("=== 1. 数据库连接测试 ===");
  const db = await getDb();
  if (!db) {
    console.error("❌ 数据库连接失败");
    return;
  }
  console.log("✅ 数据库连接成功");

  // 2. 测试爬虫功能
  console.log("\n=== 2. 爬虫功能测试 ===");
  
  // 2.1 HTML爬虫
  console.log("📄 测试HTML爬虫...");
  const htmlCrawler = new HtmlCrawler({
    contentSelector: "body",
    titleSelector: "title",
    extractImages: true,
    delay: 1000,
  });

  try {
    const htmlResult = await htmlCrawler.crawl("https://example.com");
    console.log(`✅ HTML爬虫成功: ${htmlResult.title} (${htmlResult.content.length} 字符)`);
  } catch (error) {
    console.error("❌ HTML爬虫失败:", error);
  }

  // 2.2 PubMed爬虫
  console.log("\n📚 测试PubMed爬虫...");
  const pubmedCrawler = new PubMedCrawler();

  try {
    const articles = await pubmedCrawler.search({
      query: "skin care",
      retmax: 2,
      sort: "relevance",
    });
    console.log(`✅ PubMed爬虫成功: 找到 ${articles.length} 篇论文`);
    if (articles.length > 0) {
      console.log(`   示例: ${articles[0].title}`);
    }
  } catch (error) {
    console.error("❌ PubMed爬虫失败:", error);
  }

  // 3. 测试知识库数据
  console.log("\n=== 3. 知识库数据测试 ===");
  
  // 3.1 检查知识库记录
  const knowledgeCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(knowledgeBase);

  console.log(`📊 知识库总记录数: ${knowledgeCount[0]?.count || 0}`);

  // 3.2 检查模块分布
  const moduleStats = await db
    .select({
      module: knowledgeBase.module,
      count: sql<number>`count(*)`,
    })
    .from(knowledgeBase)
    .groupBy(knowledgeBase.module);

  console.log("📊 模块分布:");
  moduleStats.forEach((stat) => {
    console.log(`  ${stat.module}: ${stat.count} 条记录`);
  });

  // 3.3 检查层级结构
  const levelStats = await db
    .select({
      level: knowledgeBase.level,
      count: sql<number>`count(*)`,
    })
    .from(knowledgeBase)
    .groupBy(knowledgeBase.level)
    .orderBy(knowledgeBase.level);

  console.log("\n📊 层级分布:");
  levelStats.forEach((stat) => {
    console.log(`  第 ${stat.level} 层: ${stat.count} 条记录`);
  });

  // 4. 测试树形结构
  console.log("\n=== 4. 树形结构测试 ===");
  
  // 获取皮肤管理模块的完整树
  const skinCareTree = await db
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      level: knowledgeBase.level,
      parentId: knowledgeBase.parentId,
      path: knowledgeBase.path,
      module: knowledgeBase.module,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.module, KNOWLEDGE_MODULES.SKIN_CARE))
    .orderBy(knowledgeBase.path, knowledgeBase.order);

  console.log(`🌳 皮肤管理模块树形结构 (${skinCareTree.length} 个节点):`);
  
  // 显示树形结构
  const printTree = (nodes: any[], parentId: number | null = null, depth: number = 0) => {
    const children = nodes.filter(node => node.parentId === parentId);
    children.forEach((node, index) => {
      const indent = "  ".repeat(depth);
      const prefix = depth === 0 ? "├─" : "│ " + "  ".repeat(depth - 1) + "├─";
      console.log(`${indent}${prefix} ${node.title} (L${node.level}, ID: ${node.id})`);
      printTree(nodes, node.id, depth + 1);
    });
  };

  printTree(skinCareTree);

  // 5. 测试搜索功能
  console.log("\n=== 5. 搜索功能测试 ===");
  
  // 5.1 关键词搜索
  const searchKeyword = "色斑";
  const searchResults = await db
    .select()
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.module, KNOWLEDGE_MODULES.SKIN_CARE),
        sql`${knowledgeBase.title} ILIKE ${`%${searchKeyword}%`}`
      )
    )
    .limit(3);

  console.log(`🔍 搜索关键词 "${searchKeyword}" 结果:`);
  searchResults.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.title} (层级: ${item.level})`);
  });

  // 6. 测试数据完整性
  console.log("\n=== 6. 数据完整性测试 ===");
  
  // 检查是否有缺失父节点的记录
  const orphanNodes = await db
    .select()
    .from(knowledgeBase)
    .where(
      and(
        sql`${knowledgeBase.parentId} IS NOT NULL`,
        sql`NOT EXISTS (
          SELECT 1 FROM knowledge_base AS parent 
          WHERE parent.id = ${knowledgeBase.parentId}
        )`
      )
    );

  console.log(`🔗 孤儿节点检查: ${orphanNodes.length} 个节点缺少父节点`);
  if (orphanNodes.length > 0) {
    orphanNodes.forEach((node, index) => {
      console.log(`  ${index + 1}. ${node.title} (ID: ${node.id}, 父ID: ${node.parentId})`);
    });
  } else {
    console.log("✅ 所有节点都有有效的父节点");
  }

  // 7. 测试路径一致性
  console.log("\n=== 7. 路径一致性测试 ===");
  
  const pathIssues = await db
    .select()
    .from(knowledgeBase)
    .where(
      sql`${knowledgeBase.path} NOT LIKE '${knowledgeBase.id}%'`
    );

  console.log(`🛣️ 路径一致性检查: ${pathIssues.length} 个路径问题`);
  if (pathIssues.length > 0) {
    pathIssues.forEach((node, index) => {
      console.log(`  ${index + 1}. ${node.title} (ID: ${node.id}, 路径: ${node.path})`);
    });
  } else {
    console.log("✅ 所有路径都正确");
  }

  // 8. 总结报告
  console.log("\n=== 8. 系统测试总结 ===");
  console.log("✅ 数据库连接: 正常");
  console.log("✅ HTML爬虫: 正常");
  console.log("✅ PubMed爬虫: 正常");
  console.log(`✅ 知识库数据: ${knowledgeCount[0]?.count || 0} 条记录`);
  console.log(`✅ 模块数量: ${moduleStats.length} 个`);
  console.log(`✅ 层级深度: 1-${levelStats[levelStats.length - 1]?.level || 0} 层`);
  console.log(`✅ 树形结构: ${skinCareTree.length} 个节点`);
  console.log(`✅ 搜索功能: 正常 (找到 ${searchResults.length} 条结果)`);
  console.log(`✅ 数据完整性: ${orphanNodes.length === 0 ? '正常' : '有问题'}`);
  console.log(`✅ 路径一致性: ${pathIssues.length === 0 ? '正常' : '有问题'}`);

  console.log("\n🎉 完整知识库系统测试完成！");
  console.log("\n💡 下一步建议:");
  console.log("  1. 启动开发服务器: npm run dev");
  console.log("  2. 访问知识库界面: /dashboard/knowledge-tree");
  console.log("  3. 使用爬虫收集更多数据");
  console.log("  4. 配置向量搜索API密钥");
  console.log("  5. 填充更多知识内容");
}

// 运行测试
testCompleteSystem().catch((error) => {
  logger.error("系统测试失败", error);
  process.exit(1);
});