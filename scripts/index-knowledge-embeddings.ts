import "dotenv/config";
import { eq, and, sql as dsql } from "drizzle-orm";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { generateEmbedding, resolveEmbeddingProvider } from "../server/_core/embeddings";

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败（DATABASE_URL？）");

  const provider = resolveEmbeddingProvider();
  if (!provider) {
    throw new Error("未配置 embedding：请设置 QWEN_API_KEY 或 OPENAI_API_KEY");
  }

  const limit = Number(getArg("limit") || process.env.KNOWLEDGE_INDEX_LIMIT || 50);
  const force = (getArg("force") || "").toLowerCase() === "true" || process.env.KNOWLEDGE_INDEX_FORCE === "1";
  const module = getArg("module") || process.env.KNOWLEDGE_INDEX_MODULE || undefined;

  // 确保 pgvector 已启用（否则后续 vector 检索不可用，但 embedding 仍可写入）
  try {
    await db.execute(dsql`SELECT 1 FROM pg_extension WHERE extname = 'vector' LIMIT 1`);
  } catch (e) {
    console.warn("⚠️ pgvector 可能未启用（建议先运行 pnpm run db:pgvector）");
  }

  const whereConds: any[] = [eq(knowledgeBase.isActive, 1)];
  if (module) whereConds.push(eq(knowledgeBase.module, module));
  if (!force) whereConds.push(dsql`${knowledgeBase.embedding} IS NULL`);

  const items = await db
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      summary: knowledgeBase.summary,
      content: knowledgeBase.content,
    })
    .from(knowledgeBase)
    .where(and(...whereConds))
    .limit(limit);

  let ok = 0;
  let fail = 0;
  let printed = 0;
  const maxPrint = Number(process.env.KNOWLEDGE_INDEX_MAX_ERROR_PRINT || 5);

  for (const it of items) {
    try {
      const text = `${it.title}\n${it.summary || ""}\n${it.content || ""}`.replace(/\n/g, " ").slice(0, 8191);
      const { embedding } = await generateEmbedding(text);
      const literal = JSON.stringify(embedding); // pgvector 接受 "[...]" 形式

      await db
        .update(knowledgeBase)
        .set({ embedding: literal, updatedAt: new Date() })
        .where(eq(knowledgeBase.id, it.id));

      ok++;
      process.stdout.write(`✅ indexed ${it.id}\n`);
    } catch (e) {
      fail++;
      process.stdout.write(`❌ failed ${it.id}\n`);
      if (printed < maxPrint) {
        printed++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`   reason(${it.id}): ${msg}`);
      }
    }
  }

  console.log(`\n完成：total=${items.length}, ok=${ok}, fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

