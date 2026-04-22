/**
 * 仅执行索引 SQL，不依赖 Drizzle 迁移历史。
 * 适用于表已存在（如用 create-all-tables.sql 建的库）只补索引的场景。
 * 幂等：CREATE INDEX IF NOT EXISTS，可重复执行。运行：npm run apply-indexes
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL 未配置，请在 .env 中设置");
  }
  const sqlPath = join(process.cwd(), "scripts", "apply-indexes-only.sql");
  const content = readFileSync(sqlPath, "utf-8");
  const statements = content
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  const client = postgres(url, { onnotice: () => {} });
  for (const stmt of statements) {
    const q = stmt + ";";
    try {
      await client.unsafe(q);
      console.log("OK:", q.slice(0, 60) + "...");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = (e as { code?: string })?.code;
      if (msg.includes("already exists") || (typeof code === "string" && code === "42P07")) {
        console.log("SKIP (已存在):", q.slice(0, 60) + "...");
      } else if (msg.includes("不存在") || (typeof code === "string" && code === "42703")) {
        console.log("SKIP (列不存在，跳过该索引):", q.slice(0, 60) + "...");
      } else {
        throw e;
      }
    }
  }
  await client.end();
  console.log("索引已应用完成。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
