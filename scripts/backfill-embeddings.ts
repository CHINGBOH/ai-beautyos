/**
 * Backfill embeddings for knowledge_base rows where `embedding IS NULL`.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-embeddings.ts            # backfill all NULL
 *   pnpm tsx scripts/backfill-embeddings.ts --seed     # also insert demo rows
 *   pnpm tsx scripts/backfill-embeddings.ts --rebuild  # re-embed everything
 *
 * Embedding provider is whichever resolveEmbeddingProvider() picks
 * (QWEN_API_KEY > OPENAI_API_KEY > offline hash fallback). Reads
 * .env automatically because the server's env loader runs on import.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { generateEmbedding } from "../server/_core/embeddings";

const BATCH = Number(process.env.BACKFILL_BATCH ?? 32);
const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";

const SAMPLE_ROWS = [
  {
    title: "光子嫩肤治疗流程",
    content:
      "光子嫩肤通过强脉冲光改善色斑、毛细血管扩张和肤色不均。单次治疗 20-30 分钟，建议 4-6 次为一个疗程，间隔 3-4 周。",
    category: "项目介绍",
    tags: ["光子嫩肤", "美容"],
  },
  {
    title: "热玛吉抗衰",
    content:
      "热玛吉 (Thermage) 使用射频技术刺激胶原蛋白再生，紧致松弛皮肤，主要用于面部、眼周和颈部抗衰老。",
    category: "项目介绍",
    tags: ["热玛吉", "抗衰"],
  },
  {
    title: "玻尿酸注射注意事项",
    content:
      "玻尿酸注射前请避免饮酒、阿司匹林等抗凝药物。注射后 24 小时内避免按压注射部位，48 小时内避免剧烈运动和高温环境。",
    category: "术后护理",
    tags: ["玻尿酸", "注射"],
  },
  {
    title: "肉毒素治疗适应症",
    content:
      "肉毒素 (Botox) 用于改善动力性皱纹，如鱼尾纹、抬头纹、眉间纹，也可用于咬肌肥大瘦脸、多汗症治疗。",
    category: "项目介绍",
    tags: ["肉毒素", "除皱"],
  },
  {
    title: "客户咨询接待标准话术",
    content:
      "首次接待客户应主动问候，了解需求，介绍机构资质，避免承诺具体效果。建议引导客户面诊后由医生评估。",
    category: "客服SOP",
    tags: ["话术", "接待"],
  },
];

async function main() {
  const args = new Set(process.argv.slice(2));
  const db = await getDb();
  if (!db) throw new Error("DB not configured");

  if (args.has("--seed")) {
    console.log(`[backfill] inserting ${SAMPLE_ROWS.length} sample rows...`);
    for (const r of SAMPLE_ROWS) {
      await db.execute(sql`
        INSERT INTO knowledge_base (tenant_id, title, content, category, tags, is_active)
        VALUES (${DEFAULT_TENANT}::uuid, ${r.title}, ${r.content}, ${r.category},
                ${JSON.stringify(r.tags)}::jsonb, 1)
        ON CONFLICT DO NOTHING
      `);
    }
  }

  if (args.has("--rebuild")) {
    console.log("[backfill] clearing all embeddings...");
    await db.execute(sql`UPDATE knowledge_base SET embedding = NULL`);
  }

  let totalProcessed = 0;
  while (true) {
    const res = await db.execute(sql`
      SELECT id, title, content
      FROM knowledge_base
      WHERE embedding IS NULL AND is_active = 1
      ORDER BY id
      LIMIT ${BATCH}
    `);
    const rows = (res as any).rows ?? res;
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      const text = `${row.title}\n${row.content}`.slice(0, 4000);
      const { embedding } = await generateEmbedding(text);
      const vec = `[${embedding.join(",")}]`;
      await db.execute(sql`
        UPDATE knowledge_base
        SET embedding = ${vec}::vector
        WHERE id = ${row.id}
      `);
      totalProcessed++;
      if (totalProcessed % 10 === 0 || rows.length < BATCH) {
        console.log(`[backfill] processed ${totalProcessed} (last: ${row.title})`);
      }
    }
  }

  const final = await db.execute(sql`
    SELECT count(*)::int AS total,
           count(embedding)::int AS with_embed
    FROM knowledge_base
  `);
  const summary = ((final as any).rows ?? final)[0];
  console.log(`[backfill] done. total=${summary.total} with_embed=${summary.with_embed}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[backfill] failed:", e);
  process.exit(1);
});
