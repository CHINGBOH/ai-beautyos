import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL 未配置");
  }

  const sql = postgres(url);
  const rows = await sql.unsafe<
    Array<{ column_name: string; data_type: string; is_nullable: string }>
  >(
    "select column_name,data_type,is_nullable from information_schema.columns where table_name='knowledge_base' order by ordinal_position"
  );

  console.log(rows.map((r) => `${r.column_name}\t${r.data_type}\t${r.is_nullable}`).join("\n"));
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

