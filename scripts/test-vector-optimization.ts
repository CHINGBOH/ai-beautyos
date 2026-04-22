#!/usr/bin/env tsx
/**
 * PostgreSQL数据库向量优化测试脚本
 * 检查pgvector状态、embedding覆盖率、性能指标
 */

import { config } from 'dotenv';

// 加载环境变量
config();

import { getVectorSupport, getEmbeddingStats, checkPgvectorExtension } from "../server/db-vector";
import { intelligentSearch } from "../server/knowledge-retrieval";
import { logger } from "../server/_core/logger";

async function main() {
  console.log("🔍 PostgreSQL 数据库向量优化状态检查\n");
  
  try {
    // 1. 检查向量支持状态
    console.log("📊 向量支持状态检查...");
    const vectorSupport = await getVectorSupport();
    
    console.log(`📦 pgvector插件: ${vectorSupport.hasExtension ? '✅ 已安装' : '❌ 未安装'}`);
    console.log(`🗂️  embedding字段: ${vectorSupport.hasEmbeddingColumn ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`📈 向量数据数量: ${vectorSupport.totalEmbeddings}`);
    
    if (vectorSupport.recommendations.length > 0) {
      console.log("\n🔧 优化建议:");
      vectorSupport.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    // 2. 检查embedding统计
    console.log("\n📈 Embedding 覆盖率统计...");
    const stats = await getEmbeddingStats();
    
    console.log(`📚 知识库总数: ${stats.total}`);
    console.log(`🔢 有向量数据: ${stats.withEmbedding}`);
    console.log(`📊 覆盖率: ${stats.coverage.toFixed(1)}%`);
    console.log(`🧮 平均维度: ${stats.avgDimension}`);
    
    // 3. 测试智能搜索
    console.log("\n🔎 智能搜索功能测试...");
    
    const testQueries = [
      "祛斑效果怎么样",
      "玻尿酸填充价格", 
      "热玛吉能维持多久",
      "有副作用吗"
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 测试查询: "${query}"`);
      
      const results = await intelligentSearch(query, { limit: 2 });
      
      if (results.length > 0) {
        console.log(`   ✅ 找到 ${results.length} 个结果`);
        console.log(`   🎯 搜索策略: ${results[0].searchStrategy}`);
        console.log(`   📋 匹配类型: ${results.map(r => r.matchType).join(', ')}`);
        console.log(`   🎚️  相关度分数: ${results.map(r => r.relevanceScore.toFixed(1)).join(', ')}`);
      } else {
        console.log("   ❌ 未找到相关结果");
      }
    }
    
    // 4. 性能评估
    console.log("\n⏱️ 性能评估...");
    
    const startTime = Date.now();
    await intelligentSearch("医美项目效果对比", { limit: 5 });
    const searchTime = Date.now() - startTime;
    
    console.log(`🚀 搜索耗时: ${searchTime}ms`);
    
    if (searchTime < 100) {
      console.log("   ✅ 性能优秀 (<100ms)");
    } else if (searchTime < 500) {
      console.log("   🟡 性能良好 (<500ms)");
    } else {
      console.log("   🔴 性能需优化 (>500ms)");
    }
    
    // 5. 给出总体评估
    console.log("\n🏆 总体评估:");
    
    const hasVector = vectorSupport.hasExtension && vectorSupport.hasEmbeddingColumn;
    const goodCoverage = stats.coverage > 50;
    const fastSearch = searchTime < 200;
    
    if (hasVector && goodCoverage && fastSearch) {
      console.log("   🎉 数据库优化状态: 优秀");
      console.log("   💡 向量搜索已完全启用，性能良好");
    } else if (hasVector && goodCoverage) {
      console.log("   👍 数据库优化状态: 良好"); 
      console.log("   💡 向量搜索已启用，可考虑进一步优化性能");
    } else if (hasVector) {
      console.log("   🔄 数据库优化状态: 部分完成");
      console.log("   💡 建议为更多知识库条目生成embeddings");
    } else {
      console.log("   🚧 数据库优化状态: 需要配置");
      console.log("   💡 请先配置pgvector插件和对应字段");
    }
    
  } catch (error) {
    console.error("❌ 检查过程中出现错误:", error);
    console.log("\n🔧 可能的解决方案:");
    console.log("   1. 检查数据库连接配置");
    console.log("   2. 确保数据库服务正在运行");
    console.log("   3. 检查环境变量配置 (DATABASE_URL)");
  }
}

// 直接执行主函数
main().then(() => {
  console.log("\n✅ 检查完成");
  process.exit(0);
}).catch(error => {
  console.error('检查失败:', error);
  process.exit(1);
});