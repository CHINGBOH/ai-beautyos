/**
 * Vector Search (RAG) Service
 * pgvector 语义检索业务逻辑；router 只负责鉴权与参数校验。
 */

import { TRPCError } from "@trpc/server";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { knowledgeBase } from "../../drizzle/schema";
import { generateEmbedding, resolveEmbeddingProvider } from "../_core/embeddings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
  return db;
}

async function hasPgvector(db: any): Promise<boolean> {
  try {
    const res = await db.execute(sql`SELECT 1 FROM pg_extension WHERE extname = 'vector' LIMIT 1`);
    return Boolean((res as any)?.rows?.length || (res as any)?.length);
  } catch {
    return false;
  }
}

function toVectorLiteral(vec: number[]): string {
  return JSON.stringify(vec);
}

function buildWhereConditions(input: { module?: string; filters?: { difficulty?: string; credibility?: number } }, extra?: any[]) {
  const conditions: any[] = extra ?? [];
  if (input.module) conditions.push(eq(knowledgeBase.module, input.module));
  if (input.filters?.difficulty) conditions.push(eq(knowledgeBase.difficulty, input.filters.difficulty));
  if (input.filters?.credibility) conditions.push(sql`${knowledgeBase.credibility} >= ${input.filters.credibility}`);
  return conditions;
}

async function keywordSearch(db: any, input: { query: string; module?: string; limit: number; filters?: { difficulty?: string; credibility?: number } }) {
  const searchTerm = `%${input.query}%`;
  const whereConditions = buildWhereConditions(input, [
    eq(knowledgeBase.isActive, 1),
    or(ilike(knowledgeBase.title, searchTerm), ilike(knowledgeBase.summary, searchTerm), ilike(knowledgeBase.content, searchTerm)),
  ]);

  const rows = await db
    .select({
      id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary,
      content: knowledgeBase.content, module: knowledgeBase.module, difficulty: knowledgeBase.difficulty, credibility: knowledgeBase.credibility,
    })
    .from(knowledgeBase)
    .where(and(...whereConditions))
    .orderBy(desc(knowledgeBase.credibility), desc(knowledgeBase.viewCount))
    .limit(input.limit);

  return {
    mode: "keyword_only" as const,
    results: rows.map((r: any) => ({
      ...r,
      content: r.content ? r.content.slice(0, 500) + (r.content.length > 500 ? "..." : "") : "",
      similarity: 0,
      matchType: "keyword" as const,
    })),
  };
}

async function semanticSearch(db: any, input: { query: string; module?: string; limit: number; threshold: number; filters?: { difficulty?: string; credibility?: number } }) {
  const { embedding: queryVec } = await generateEmbedding(input.query);
  const q = toVectorLiteral(queryVec);

  const whereConditions = buildWhereConditions(input, [
    eq(knowledgeBase.isActive, 1),
    sql`${knowledgeBase.embedding} IS NOT NULL`,
  ]);

  const similarityExpr = sql<number>`1 - (${q}::vector <=> ${knowledgeBase.embedding}::vector)`;
  const rows = await db
    .select({
      id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary,
      content: knowledgeBase.content, module: knowledgeBase.module, difficulty: knowledgeBase.difficulty, credibility: knowledgeBase.credibility,
      similarity: similarityExpr,
    })
    .from(knowledgeBase)
    .where(and(...whereConditions))
    .orderBy(desc(similarityExpr))
    .limit(input.limit * 3);

  const results = rows
    .map((r: any) => ({
      ...r,
      content: r.content ? r.content.slice(0, 500) + (r.content.length > 500 ? "..." : "") : "",
      similarity: Number(r.similarity),
      matchType: "semantic" as const,
    }))
    .filter((r: any) => r.similarity >= input.threshold)
    .slice(0, input.limit);

  return { mode: "vector" as const, results };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getVectorCapability() {
  const db = await getDb();
  const provider = resolveEmbeddingProvider();
  if (!db) {
    return { db: false, pgvector: false, embeddingProvider: provider ? { provider: provider.provider, model: provider.model } : null, mode: "keyword_only" as const };
  }
  const pgvector = await hasPgvector(db);
  const canVector = Boolean(pgvector && provider);
  return {
    db: true,
    pgvector,
    embeddingProvider: provider ? { provider: provider.provider, model: provider.model, baseURL: (provider as any).baseURL } : null,
    mode: canVector ? "vector" as const : "keyword_only" as const,
  };
}

export async function vectorSearch(input: { query: string; module?: string; limit: number; threshold: number; filters?: { difficulty?: string; credibility?: number } }) {
  const db = await requireDb();
  const provider = resolveEmbeddingProvider();
  const pgvector = await hasPgvector(db);
  const canVector = Boolean(provider && pgvector);

  const data = canVector
    ? await semanticSearch(db, input).catch(() => keywordSearch(db, input))
    : await keywordSearch(db, input);

  return { query: input.query, threshold: input.threshold, totalFound: data.results.length, mode: data.mode, results: data.results };
}

export async function indexContent(contentId: number, force: boolean) {
  const db = await requireDb();
  if (!resolveEmbeddingProvider()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "未配置 embedding（请设置 QWEN_API_KEY 或 OPENAI_API_KEY）" });
  }

  const rows = await db
    .select({ id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary, content: knowledgeBase.content, embedding: knowledgeBase.embedding })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, contentId))
    .limit(1);

  const item = rows[0];
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "内容不存在" });
  if (item.embedding && !force) return { success: true, message: "内容已索引", contentId };

  const text = `${item.title}\n${item.summary || ""}\n${item.content || ""}`;
  const { embedding } = await generateEmbedding(text);
  await db.update(knowledgeBase).set({ embedding, updatedAt: new Date().toISOString() }).where(eq(knowledgeBase.id, contentId));

  return { success: true, message: "内容索引成功", contentId };
}

export async function batchIndexContent(input: { module?: string; limit: number; force: boolean }) {
  const db = await requireDb();
  if (!resolveEmbeddingProvider()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "未配置 embedding（请设置 QWEN_API_KEY 或 OPENAI_API_KEY）" });
  }

  const whereConditions: any[] = [eq(knowledgeBase.isActive, 1)];
  if (input.module) whereConditions.push(eq(knowledgeBase.module, input.module));
  if (!input.force) whereConditions.push(sql`${knowledgeBase.embedding} IS NULL`);

  const items = await db
    .select({ id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary, content: knowledgeBase.content })
    .from(knowledgeBase)
    .where(and(...whereConditions))
    .limit(input.limit);

  let ok = 0;
  let fail = 0;
  for (const it of items) {
    try {
      const text = `${it.title}\n${it.summary || ""}\n${it.content || ""}`;
      const { embedding } = await generateEmbedding(text);
      await db.update(knowledgeBase).set({ embedding, updatedAt: new Date().toISOString() }).where(eq(knowledgeBase.id, it.id));
      ok++;
    } catch {
      fail++;
    }
  }

  return { success: true, total: items.length, successful: ok, failed: fail };
}

export async function getVectorStats() {
  const db = await requireDb();
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
}
