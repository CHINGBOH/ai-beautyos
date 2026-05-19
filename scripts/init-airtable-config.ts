/**
 * 初始化Airtable配置到数据库
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { systemConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function initAirtableConfig() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("❌ 数据库连接失败，请检查 DATABASE_URL");
      process.exit(1);
    }

    const token = process.env.AIRTABLE_API_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!token || !baseId) {
      console.error("❌ 请先配置 AIRTABLE_API_TOKEN 和 AIRTABLE_BASE_ID 环境变量");
      process.exit(1);
    }

    const configValue = JSON.stringify({
      token,
      baseId,
    });

    // 检查是否已存在
    const existing = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, "airtable"))
      .limit(1);

    if (existing.length > 0) {
      // 更新
      await db
        .update(systemConfig)
        .set({
          configValue,
          updatedAt: new Date(),
        })
        .where(eq(systemConfig.configKey, "airtable"));
      console.log("✅ Airtable配置已更新");
    } else {
      // 创建
      await db.insert(systemConfig).values({
        configKey: "airtable",
        configValue,
        description: "Airtable CRM integration configuration",
        isActive: 1,
      });
      console.log("✅ Airtable配置已创建");
    }

    console.log(`   Token: ${token.substring(0, 10)}...`);
    console.log(`   Base ID: ${baseId}`);
  } catch (error: any) {
    console.error("❌ 初始化失败:", error.message);
    process.exit(1);
  }
}

initAirtableConfig().catch(console.error);
