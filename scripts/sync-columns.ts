/**
 * 执行 sync-columns.sql，为已存在的表补全缺失列（与当前 Drizzle schema 一致）。
 * 幂等：列已存在则跳过。运行：npm run sync-columns  或  tsx scripts/sync-columns.ts
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

/** 从按 ";" 分割后的块中去掉开头的纯注释行，避免 "-- comment\nALTER ..." 被整块过滤。 */
function stripLeadingCommentLines(block: string): string {
  const lines = block.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim().startsWith("--")) i++;
  return lines.slice(i).join("\n").trim();
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 未配置，请在 .env 中设置");

  const sqlPath = join(process.cwd(), "scripts", "sync-columns.sql");
  const content = readFileSync(sqlPath, "utf-8");
  const statements = content
    .split(";")
    .map((s) => stripLeadingCommentLines(s.trim()))
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  const client = postgres(url, { onnotice: () => {} });
  for (const stmt of statements) {
    const q = stmt + ";";
    try {
      await client.unsafe(q);
      console.log("OK:", q.slice(0, 70) + "...");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = (e as { code?: string })?.code;
      if (msg.includes("already exists") || code === "42701") {
        console.log("SKIP (列已存在):", q.slice(0, 70) + "...");
      } else {
        throw e;
      }
    }
  }
  await client.end();
  console.log("列同步完成。可再执行 npm run apply-indexes 补建之前跳过的索引。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
