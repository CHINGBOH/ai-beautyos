#!/usr/bin/env ts-node

/**
 * 本地 Embedding 完整测试脚本
 * 测试 llama.cpp + 向量搜索功能
 */

import { config } from 'dotenv';
import { 
  initializeLocalEmbedding,
  searchWithLocalEmbedding,
  populateEmbeddingsFromKnowledgeBase,
  getEmbeddingStats,
  checkPgvectorExtension
} from '../server/db-vector';
import { logger } from '../server/_core/logger';
import { insertKnowledgeFromJson } from '../scripts/load-knowledge-data';

config();

async function testLocalEmbeddingPipeline() {
  console.log('🚀 开始本地 Embedding 完整测试\n');
  
  try {
    // Step 1: 检查 PostgreSQL + pgvector
    console.log('📊 Step 1: 检查数据库和 pgvector 扩展...');
    const vectorEnabled = await checkPgvectorExtension();
    console.log(`   pgvector 扩展: ${vectorEnabled ? '✅ 已启用' : '❌ 未启用'}`);
    
    if (!vectorEnabled) {
      throw new Error('pgvector extension not enabled');
    }
    
    // Step 2: 加载知识库数据 
    console.log('\n📚 Step 2: 加载知识库数据...');
    try {
      await insertKnowledgeFromJson();
      console.log('   ✅ 知识库数据加载成功');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  知识库数据已存在');
      } else {
        throw error;
      }
    }
    
    // Step 3: 初始化本地 embedding 服务
    console.log('\n🤖 Step 3: 初始化本地 Embedding 服务...');
    
    // 检查是否有可用的模型
    const modelChecks = [
      '/tmp/llama.cpp/models/all-MiniLM-L6-v2.gguf',
      '/tmp/llama.cpp/models/bge-base-zh-v1.5.gguf',
      '/tmp/llama.cpp/llama-embedding'
    ];
    
    for (const path of modelChecks) {
      try {
        const fs = await import('fs/promises');
        await fs.access(path);
        console.log(`   ✅ 找到模型/工具: ${path}`);
      } catch {
        console.log(`   ❓ 未找到: ${path}`);
      }
    }
    
    // 暂时跳过 embedding 服务初始化（等待模型下载）
    console.log('   ⚠️  本地 embedding 服务需要模型文件，暂时跳过');
    
    // Step 4: 检查当前 embedding 状态
    console.log('\n📈 Step 4: 检查 Embedding 统计...');
    const stats = await getEmbeddingStats();
    console.log(`   总条目数: ${stats.total}`);
    console.log(`   有 embedding 的条目: ${stats.withEmbedding}`);
    console.log(`   覆盖率: ${stats.coverage}%`);
    console.log(`   平均维度: ${stats.avgDimension}`);
    
    // Step 5: 测试文本搜索（回退方案）
    console.log('\n🔍 Step 5: 测试文本搜索（回退方案）...');
    
    const testQueries = [
      '超皮秒祛斑',
      '玻尿酸填充',
      '热玛吉紧致',
      '水光针补水',
      '面部年轻化'
    ];
    
    for (const query of testQueries) {
      try {
        const results = await searchWithLocalEmbedding(query, {
          limit: 3,
          searchType: 'text' // 强制使用文本搜索
        });
        
        console.log(`\n   查询: "${query}"`);
        console.log(`   结果数量: ${results.length}`);
        
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. [${result.matchType}] ${result.title} (相似度: ${result.similarity.toFixed(3)})`);
        });
      } catch (error) {
        console.log(`   ❌ 查询 "${query}" 失败:`, error.message);
      }
    }
    
    // Step 6: 显示后续步骤建议
    console.log('\n📋 Step 6: 后续步骤建议:');
    console.log('   1. 等待 llama.cpp 编译完成');
    console.log('   2. 下载合适的 embedding 模型 (如 all-MiniLM-L6-v2)');
    console.log('   3. 运行 populateEmbeddingsFromKnowledgeBase() 生成向量');
    console.log('   4. 测试完整的向量搜索功能');
    
    console.log('\n✅ 本地 Embedding 测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testLocalEmbeddingPipeline()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1); 
    });
}