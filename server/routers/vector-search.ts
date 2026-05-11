/**
 * 向量搜索路由（pgvector）
 *
 * 目标：把知识库做成真正的 RAG 外挂检索层：
 * - embedding：支持 Qwen（DashScope OpenAI 兼容）或 OpenAI（自动选择）
 * - pgvector：负责向量相似度检索
 * - 自动降级：没配置 embedding / 没安装 pgvector / 没有 embedding 数据时，降级关键词检索（保证可用）
 *
 * embedding 存在 knowledge_base.embedding（text）中，内容是 JSON 数组字符串，如 "[0.1,0.2,...]"
 * pgvector 允许将该字符串 cast 成 vector：`embedding::vector`
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { knowledgeBase } from "../../drizzle/schema";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { generateEmbedding, resolveEmbeddingProvider } from "../_core/embeddings";

const vectorSearchInput = z.object({
  query: z.string().min(1, "搜索查询不能为空"),
  module: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  filters: z
    .object({
      difficulty: z.string().optional(),
      credibility: z.number().min(1).max(10).optional(),
    })
    .optional(),
});

const indexContentInput = z.object({
  contentId: z.number(),
  force: z.boolean().default(false),
});

async function hasPgvector(db: any): Promise<boolean> {
  try {
    const res = await db.execute(
      sql`SELECT 1 FROM pg_extension WHERE extname = 'vector' LIMIT 1`
    );
    return Boolean((res as any)?.rows?.length || (res as any)?.length);
  } catch {
    return false;
  }
}

function toVectorLiteral(vec: number[]): string {
  // pgvector 接受格式：[1,2,3]
  return JSON.stringify(vec);
}

async function keywordSearch(db: any, input: z.infer<typeof vectorSearchInput>) {
  const searchTerm = `%${input.query}%`;
  const whereConditions: any[] = [
    eq(knowledgeBase.isActive, 1),
    or(
      ilike(knowledgeBase.title, searchTerm),
      ilike(knowledgeBase.summary, searchTerm),
      ilike(knowledgeBase.content, searchTerm)
    ),
  ];
  if (input.module) whereConditions.push(eq(knowledgeBase.module, input.module));
  if (input.filters?.difficulty) {
    whereConditions.push(eq(knowledgeBase.difficulty, input.filters.difficulty));
  }
  if (input.filters?.credibility) {
    whereConditions.push(
      sql`${knowledgeBase.credibility} >= ${input.filters.credibility}`
    );
  }

  const rows = await db
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      summary: knowledgeBase.summary,
      content: knowledgeBase.content,
      module: knowledgeBase.module,
      difficulty: knowledgeBase.difficulty,
      credibility: knowledgeBase.credibility,
    })
    .from(knowledgeBase)
    .where(and(...whereConditions))
    .orderBy(desc(knowledgeBase.credibility), desc(knowledgeBase.viewCount))
    .limit(input.limit);

  return {
    mode: "keyword_only" as const,
    results: rows.map((r: any) => ({
      ...r,
      content: r.content
        ? r.content.slice(0, 500) + (r.content.length > 500 ? "..." : "")
        : "",
      similarity: 0,
      matchType: "keyword" as const,
    })),
  };
}

async function semanticSearch(db: any, input: z.infer<typeof vectorSearchInput>) {
  const { embedding: queryVec } = await generateEmbedding(input.query);
  const q = toVectorLiteral(queryVec);

  const whereConditions: any[] = [
    eq(knowledgeBase.isActive, 1),
    sql`${knowledgeBase.embedding} IS NOT NULL`,
  ];
  if (input.module) whereConditions.push(eq(knowledgeBase.module, input.module));
  if (input.filters?.difficulty) {
    whereConditions.push(eq(knowledgeBase.difficulty, input.filters.difficulty));
  }
  if (input.filters?.credibility) {
    whereConditions.push(
      sql`${knowledgeBase.credibility} >= ${input.filters.credibility}`
    );
  }

  // pgvector：`<=>` 是 cosine distance（0=相同，越大越不相似）
  // similarity = 1 - distance，范围约 [0,1]
  const similarityExpr = sql<number>`1 - (${q}::vector <=> ${knowledgeBase.embedding}::vector)`;

  const rows = await db
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      summary: knowledgeBase.summary,
      content: knowledgeBase.content,
      module: knowledgeBase.module,
      difficulty: knowledgeBase.difficulty,
      credibility: knowledgeBase.credibility,
      similarity: similarityExpr,
    })
    .from(knowledgeBase)
    .where(and(...whereConditions))
    .orderBy(desc(similarityExpr))
    .limit(input.limit * 3);

  const results = rows
    .map((r: any) => ({
      ...r,
      content: r.content
        ? r.content.slice(0, 500) + (r.content.length > 500 ? "..." : "")
        : "",
      similarity: Number(r.similarity),
      matchType: "semantic" as const,
    }))
    .filter((r: any) => r.similarity >= input.threshold)
    .slice(0, input.limit);

  return { mode: "vector" as const, results };
}

export const vectorSearchRouter = router({
  /**
   * 能力探测：你现在是否已具备“真正向量检索”的条件
   */
  capability: protectedProcedure.query(async () => {
    const db = await getDb();
    const provider = resolveEmbeddingProvider();
    if (!db) {
      return {
        db: false,
        pgvector: false,
        embeddingProvider: provider ? { provider: provider.provider, model: provider.model } : null,
        mode: "keyword_only" as const,
      };
    }
    const pgvector = await hasPgvector(db);
    const canVector = Boolean(pgvector && provider);
    return {
      db: true,
      pgvector,
      embeddingProvider: provider ? { provider: provider.provider, model: provider.model, baseURL: provider.baseURL } : null,
      mode: canVector ? ("vector" as const) : ("keyword_only" as const),
    };
  }),

  /**
   * 检索：优先向量，失败/条件不足时降级关键词
   */
  search: protectedProcedure.input(vectorSearchInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

    const provider = resolveEmbeddingProvider();
    const pgvector = await hasPgvector(db);
    const canVector = Boolean(provider && pgvector);

    const data = canVector
      ? await semanticSearch(db, input).catch(() => keywordSearch(db, input))
      : await keywordSearch(db, input);

    return {
      query: input.query,
      threshold: input.threshold,
      totalFound: data.results.length,
      mode: data.mode,
      results: data.results,
    };
  }),

  /**
   * 单条索引：生成 embedding 并写入 knowledge_base.embedding
   */
  indexContent: protectedProcedure.input(indexContentInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
    if (!resolveEmbeddingProvider()) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "未配置 embedding（请设置 QWEN_API_KEY 或 OPENAI_API_KEY）" });
    }

    const rows = await db
      .select({
        id: knowledgeBase.id,
        title: knowledgeBase.title,
        summary: knowledgeBase.summary,
        content: knowledgeBase.content,
        embedding: knowledgeBase.embedding,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, input.contentId))
      .limit(1);

    const item = rows[0];
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "内容不存在" });
    if (item.embedding && !input.force) {
      return { success: true, message: "内容已索引", contentId: input.contentId };
    }

    const text = `${item.title}\n${item.summary || ""}\n${item.content || ""}`;
    const { embedding } = await generateEmbedding(text);
    const literal = toVectorLiteral(embedding);

    await db
      .update(knowledgeBase)
      .set({ embedding: literal, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, input.contentId));

    return { success: true, message: "内容索引成功", contentId: input.contentId };
  }),

  /**
   * 批量索引：按模块/未索引筛选，逐条写入 embedding
   */
  batchIndex: protectedProcedure
    .input(
      z.object({
        module: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        force: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      if (!resolveEmbeddingProvider()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "未配置 embedding（请设置 QWEN_API_KEY 或 OPENAI_API_KEY）" });
      }

      const whereConditions: any[] = [eq(knowledgeBase.isActive, 1)];
      if (input.module) whereConditions.push(eq(knowledgeBase.module, input.module));
      if (!input.force) whereConditions.push(sql`${knowledgeBase.embedding} IS NULL`);

      const items = await db
        .select({
          id: knowledgeBase.id,
          title: knowledgeBase.title,
          summary: knowledgeBase.summary,
          content: knowledgeBase.content,
        })
        .from(knowledgeBase)
        .where(and(...whereConditions))
        .limit(input.limit);

      let ok = 0;
      let fail = 0;
      for (const it of items) {
        try {
          const text = `${it.title}\n${it.summary || ""}\n${it.content || ""}`;
          const { embedding } = await generateEmbedding(text);
          await db
            .update(knowledgeBase)
            .set({ embedding: toVectorLiteral(embedding), updatedAt: new Date() })
            .where(eq(knowledgeBase.id, it.id));
          ok++;
        } catch {
          fail++;
        }
      }

      return { success: true, total: items.length, successful: ok, failed: fail };
    }),

  /**
   * 统计：当前已索引比例
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

    const totals = await db
      .select({
        total: sql<number>`count(*)`,
        indexed: sql<number>`count(*) FILTER (WHERE ${knowledgeBase.embedding} IS NOT NULL)`,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, 1));

    return {
      total: totals[0]?.total || 0,
      indexed: totals[0]?.indexed || 0,
      indexRate: totals[0]?.total ? (totals[0].indexed / totals[0].total) * 100 : 0,
    };
  }),
});

