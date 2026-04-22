#!/usr/bin/env tsx
/**
 * 数据库连接测试脚本
 * 调试应用无法连接数据库的问题
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// 加载环境变量
config();

async function testDatabaseConnection() {
  console.log("🔍 数据库连接测试开始...\n");
  
  try {
    // 1. 测试环境变量
    console.log("📋 检查环境变量:");
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ 已设置' : '❌ 未设置'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
    console.log(`   当前目录: ${process.cwd()}`);
    
    // 2. 直接测试连接
    const connectionString = process.env.DATABASE_URL || 'postgresql://devuser:devpass@localhost:5432/medical_crm';
    console.log(`\n🔗 使用连接字符串: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);
    
    // 3. 测试postgres-js连接
    console.log("\n💾 测试原始postgres连接...");
    const sql = postgres(connectionString);
    
    const versionResult = await sql`SELECT version() as version`;
    console.log(`   ✅ 数据库版本: ${versionResult[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    const extensionResult = await sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`;
    if (extensionResult.length > 0) {
      console.log(`   ✅ pgvector扩展: v${extensionResult[0].extversion}`);
    } else {
      console.log("   ❌ pgvector扩展: 未安装");
    }
    
    // 4. 测试drizzle连接  
    console.log("\n🛠️ 测试Drizzle ORM连接...");
    const db = drizzle(sql);
    
    const testQueryResult = await sql`SELECT 1 as test`;
    console.log(`   ✅ Drizzle查询成功: ${testQueryResult[0].test}`);
    
    // 5. 检查表存在性
    console.log("\n📊 检查数据库表...");
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    if (tables.length > 0) {
      console.log(`   ✅ 找到 ${tables.length} 个表:`);
      tables.forEach(t => console.log(`      - ${t.tablename}`));
      
      // 检查knowledge_base表结构
      const knowledgeBaseExists = tables.some(t => t.tablename === 'knowledge_base');
      if (knowledgeBaseExists) {
        console.log("\n🗂️ 检查知识库表结构...");
        const columns = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'knowledge_base' 
          ORDER BY ordinal_position
        `;
        
        const hasEmbeddingColumn = columns.some(c => c.column_name === 'embedding');
        console.log(`   📊 embedding字段: ${hasEmbeddingColumn ? '✅ 存在' : '❌ 不存在'}`);
        
        if (!hasEmbeddingColumn) {
          console.log("   💡 需要添加向量字段");
        }
      }
    } else {
      console.log("   ❌ 没有找到表，需要运行迁移");
    }
    
    // 6. 测试vector功能
    console.log("\n🧮 测试向量功能...");
    try {
      const vectorTest = await sql`SELECT '[1,2,3]'::vector(3) as vec`;
      console.log(`   ✅ 向量类型支持正常: ${vectorTest[0].vec}`);
      
      // 测试向量距离计算
      const distanceTest = await sql`
        SELECT '[1,2,3]'::vector(3) <-> '[4,5,6]'::vector(3) as distance
      `;
      console.log(`   ✅ 向量距离计算: ${distanceTest[0].distance}`);
    } catch (error) {
      console.log(`   ❌ 向量类型错误: ${error}`);
    }
    
    await sql.end();
    
    console.log("\n🎉 数据库连接测试完成！");
    
    // 7. 给出下一步建议
    console.log("\n📋 下一步操作建议:");
    if (tables.length === 0) {
      console.log("   1. 运行数据库迁移: npx drizzle-kit migrate");
      console.log("   2. 添加向量字段: 执行 scripts/optimize-postgres.sql 中的表结构部分");
    } else {
      console.log("   1. 确认应用可以正确加载 .env 文件");
      console.log("   2. 运行向量优化测试: npx tsx scripts/test-vector-optimization.ts");
    }
    
  } catch (error) {
    console.error("\n❌ 连接测试失败:", error);
    
    console.log("\n🔧 可能的解决方案:");
    console.log("   1. 检查PostgreSQL服务是否运行: sudo systemctl status postgresql");
    console.log("   2. 检查防火墙设置: sudo ufw status");  
    console.log("   3. 检查.env文件配置");
    console.log("   4. 确认数据库用户权限");
  }
}

// 直接执行
testDatabaseConnection().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});