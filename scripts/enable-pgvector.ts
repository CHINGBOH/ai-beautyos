import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 未配置");

  const sql = postgres(url);

  // 启用 pgvector
  await sql.unsafe("CREATE EXTENSION IF NOT EXISTS vector;");

  // 烟雾测试：vector 类型与 cast 是否可用
  const rows = await sql.unsafe("SELECT '[1,2,3]'::vector as v;");
  console.log("✅ pgvector 已启用，cast 测试通过:", rows[0]?.v);

  await sql.end();
}

main().catch((e) => {
  console.error("❌ 启用 pgvector 失败", e);
  process.exit(1);
});

