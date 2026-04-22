import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 未配置");

  const sql = postgres(url);

  const statements: string[] = [
    // 层级结构
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS parent_id integer`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS path text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0`,

    // 模块与分类
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS module varchar(50) NOT NULL DEFAULT 'skin_care'`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS sub_category varchar(100)`,

    // 内容增强
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS summary text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS positive_evidence text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS negative_evidence text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS neutral_analysis text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS practical_guide text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS case_studies text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS expert_opinions text`,

    // 多媒体
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS images text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS videos text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS audio text`,

    // 元数据
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS sources text`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS credibility integer NOT NULL DEFAULT 5`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS difficulty varchar(20) DEFAULT 'beginner'`,

    // 统计
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0`,
    `ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0`,
  ];

  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }

  console.log("✅ knowledge_base 表结构已补齐（如缺失则新增）");
  await sql.end();
}

main().catch((e) => {
  console.error("❌ 迁移失败", e);
  process.exit(1);
});

