/**
 * 启动验证脚本
 * 检查环境变量、数据库连接、API配置等
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { ENV } from "../server/_core/env";

async function verifyStartup() {
  console.log("🔍 开始验证启动配置...\n");
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 检查环境变量
  console.log("1️⃣ 检查环境变量...");
  
  if (!process.env.DATABASE_URL) {
    errors.push("❌ DATABASE_URL 未配置（必需）");
  } else {
    console.log("   ✅ DATABASE_URL 已配置");
    // 验证格式
    if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
      warnings.push("⚠️  DATABASE_URL 格式可能不正确（应以 postgresql:// 开头）");
    }
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    warnings.push("⚠️  DEEPSEEK_API_KEY 未配置（AI客服功能需要）");
  } else {
    console.log("   ✅ DEEPSEEK_API_KEY 已配置");
  }

  if (!process.env.QWEN_API_KEY) {
    warnings.push("⚠️  QWEN_API_KEY 未配置（数据分析功能需要，可选）");
  } else {
    console.log("   ✅ QWEN_API_KEY 已配置");
  }

  // 2. 测试数据库连接
  console.log("\n2️⃣ 测试数据库连接...");
  try {
    const db = await getDb();
    if (!db) {
      errors.push("❌ 数据库连接失败");
    } else {
      console.log("   ✅ 数据库连接成功");
      
      // 检查关键表是否存在
      try {
        // 尝试查询users表
        await db.execute("SELECT 1 FROM users LIMIT 1");
        console.log("   ✅ 数据库表结构正常");
      } catch (err: any) {
        warnings.push(`⚠️  数据库表可能不存在，请运行 'npm run db:push' 创建表结构`);
      }
    }
  } catch (error: any) {
    errors.push(`❌ 数据库连接错误: ${error.message}`);
  }

  // 3. 检查关键文件
  console.log("\n3️⃣ 检查关键文件...");
  const fs = await import("fs");
  const path = await import("path");
  
  const criticalFiles = [
    "server/_core/index.ts",
    "server/db.ts",
    "server/routers/chat.ts",
    "server/routers/customers.ts",
    "server/wework-api.ts",
    "server/wework-webhook.ts",
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} 存在`);
    } else {
      errors.push(`❌ ${file} 不存在`);
    }
  }

  // 4. 检查依赖
  console.log("\n4️⃣ 检查关键依赖...");
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
    );
    
    const requiredDeps = ["express", "drizzle-orm", "mysql2", "axios", "xml2js"];
    for (const dep of requiredDeps) {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        console.log(`   ✅ ${dep} 已配置`);
      } else {
        warnings.push(`⚠️  ${dep} 未在package.json中找到`);
      }
    }
  } catch (error: any) {
    warnings.push(`⚠️  无法读取package.json: ${error.message}`);
  }

  // 5. 总结
  console.log("\n" + "=".repeat(50));
  console.log("📋 验证总结:");
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log("   ✅ 所有检查通过！可以启动服务器。");
  } else {
    if (errors.length > 0) {
      console.log("\n❌ 发现错误（必须修复）:");
      errors.forEach(err => console.log(`   ${err}`));
    }
    
    if (warnings.length > 0) {
      console.log("\n⚠️  发现警告（建议修复）:");
      warnings.forEach(warn => console.log(`   ${warn}`));
    }
    
    if (errors.length > 0) {
      console.log("\n💡 修复建议:");
      if (errors.some(e => e.includes("DATABASE_URL"))) {
        console.log("   1. 创建 .env 文件并配置 DATABASE_URL");
        console.log("   2. 格式: DATABASE_URL=postgresql://user:password@host:port/database");
      }
      if (errors.some(e => e.includes("数据库连接"))) {
        console.log("   1. 确保数据库服务正在运行");
        console.log("   2. 检查 DATABASE_URL 是否正确");
        console.log("   3. 运行 'pnpm db:push' 创建表结构");
      }
    }
  }
  
  console.log("=".repeat(50) + "\n");

  if (errors.length > 0) {
    process.exit(1);
  }
}

verifyStartup().catch((error) => {
  console.error("验证过程出错:", error);
  process.exit(1);
});
