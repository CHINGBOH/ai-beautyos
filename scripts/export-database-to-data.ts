/**
 * 将数据库所有表数据导出到 data/ 目录，每表一个 JSON 文件。
 * 使用 SELECT * 按表名导出，兼容与 schema 不同步的数据库。
 * 运行：npx tsx scripts/export-database-to-data.ts  或  npm run export:db
 * 要求：DATABASE_URL 已配置
 */
import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import postgres from "postgres";

const DATA_DIR = join(process.cwd(), "data");

const TABLE_NAMES = [
  "knowledge_base",
  "trigger_executions",
  "wework_contact_way",
  "wework_messages",
  "system_config",
  "xiaohongshu_posts",
  "xiaohongshu_content_history",
  "wework_customers",
  "conversations",
  "leads",
  "triggers",
  "messages",
  "users",
  "wework_config",
  "xiaohongshu_comments",
  "user_learning_progress",
  "expert_reviews",
  "content_quality_metrics",
  "user_learning_preferences",
  "learning_analytics",
  "website_content",
  "medical_projects",
  "website_navigation",
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  mkdirSync(DATA_DIR, { recursive: true });

  const sql = postgres(url);

  for (const tableName of TABLE_NAMES) {
    try {
      // 使用双引号包裹表名，避免保留字/大小写问题；表名来自固定列表，无注入风险
      const rows = await sql.unsafe(`SELECT * FROM "${tableName}"`);
      const path = join(DATA_DIR, `${tableName}.json`);
      writeFileSync(path, JSON.stringify(rows, null, 2), "utf-8");
      console.log(`Wrote ${Array.isArray(rows) ? rows.length : 0} rows -> ${path}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("does not exist") || msg.includes("不存在")) {
        console.warn(`Skip (table missing): ${tableName}`);
      } else {
        throw err;
      }
    }
  }

  await sql.end();
  console.log("Done. All tables exported to", DATA_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
