#!/usr/bin/env tsx

/**
 * 测试向量搜索功能
 * 验证LLM外挂知识库的检索能力
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { generateEmbedding } from "../server/_core/embeddings";
import { sql } from "drizzle-orm";

async function testVectorSearch() {
  console.log("🔍 测试向量搜索功能...\n");

  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  // 测试查询列表
  const testQueries = [
    "激光祛斑技术",
    "皮肤再生和修复",
    "医美项目价格",
    "超皮秒治疗效果",
    "热玛吉紧肤原理"
  ];

  for (const query of testQueries) {
    console.log(`📝 查询: "${query}"`);
    
    try {
      // 1. 生成查询的向量嵌入
      const { embedding } = await generateEmbedding(query);
      
      // 2. 执行向量相似度搜索
      const results = await db
        .select({
          id: knowledgeBase.id,
          title: knowledgeBase.title,
          module: knowledgeBase.module,
          similarity: sql<number>`1 - (${knowledgeBase.embedding}::vector <=> ${JSON.stringify(embedding)}::vector)`.as("similarity"),
          content_preview: sql<string>`LEFT(${knowledgeBase.content}, 100)`.as("content_preview")
        })
        .from(knowledgeBase)
        .where(sql`${knowledgeBase.embedding} IS NOT NULL`)
        .orderBy(sql`${knowledgeBase.embedding}::vector <=> ${JSON.stringify(embedding)}::vector`)
        .limit(3);

      console.log(`✅ 找到 ${results.length} 个相关结果:`);
      
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. [相似度: ${(result.similarity * 100).toFixed(1)}%] ${result.title}`);
        console.log(`      模块: ${result.module}, 预览: ${result.content_preview}...`);
      });
      
      console.log();

    } catch (error) {
      console.error(`❌ 查询失败: ${error instanceof Error ? error.message : String(error)}`);
      console.log();
    }
  }

  // 测试知识库统计
  console.log("📊 知识库统计信息:");
  
  const stats = await db
    .select({
      module: knowledgeBase.module,
      count: sql<number>`COUNT(*)`.as("count"),
      avg_length: sql<number>`AVG(LENGTH(${knowledgeBase.content}))`.as("avg_length"),
      has_embedding: sql<number>`COUNT(CASE WHEN ${knowledgeBase.embedding} IS NOT NULL THEN 1 END)`.as("has_embedding")
    })
    .from(knowledgeBase)
    .groupBy(knowledgeBase.module)
    .orderBy(sql`COUNT(*) DESC`);

  stats.forEach(stat => {
    console.log(`   ${stat.module}: ${stat.count} 条记录, 平均长度: ${Math.round(stat.avg_length)} 字符, 向量嵌入: ${stat.has_embedding}`);
  });

  console.log("\n🎯 LLM外挂知识库准备状态:");
  
  const totalStats = await db
    .select({
      total: sql<number>`COUNT(*)`.as("total"),
      total_length: sql<number>`SUM(LENGTH(${knowledgeBase.content}))`.as("total_length"),
      embedding_coverage: sql<number>`ROUND(COUNT(CASE WHEN ${knowledgeBase.embedding} IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1)`.as("embedding_coverage")
    })
    .from(knowledgeBase);

  const stat = totalStats[0];
  if (stat) {
    console.log(`   ✅ 总记录数: ${stat.total} 条`);
    console.log(`   ✅ 总内容长度: ${stat.total_length.toLocaleString()} 字符`);
    console.log(`   ✅ 向量嵌入覆盖率: ${stat.embedding_coverage}%`);
    console.log(`   ✅ 平均每条: ${Math.round(stat.total_length / stat.total)} 字符`);
  }

  console.log("\n🚀 LLM外挂知识库已准备就绪！");
  console.log("📋 可用于:");
  console.log("   1. AI客服问答增强");
  console.log("   2. 智能内容推荐");
  console.log("   3. 专业知识检索");
  console.log("   4. 客户画像分析");
}

// 主函数
async function main() {
  try {
    await testVectorSearch();
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

main();